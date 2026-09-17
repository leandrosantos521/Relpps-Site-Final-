const crypto = require('crypto');
const { getSaleOrder } = require('./_lib/bling-client');
const { syncUberFreightForOrder } = require('./checkout');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},
    body: JSON.stringify(body)
  };
}

function header(event, name) {
  const wanted = String(name).toLowerCase();
  for (const [k,v] of Object.entries(event.headers || {})) {
    if (String(k).toLowerCase() === wanted) return String(v || '');
  }
  return '';
}

function verifySignature(event, rawBody) {
  const secret = String(process.env.BLING_CLIENT_SECRET || '').trim();
  if (!secret) return false;
  const received = header(event, 'x-bling-signature-256');
  if (!/^sha256=[a-f0-9]{64}$/i.test(received)) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(Buffer.from(rawBody || '', 'utf8')).digest('hex');
  const a = Buffer.from(received.toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}

exports.handler = async (event) => {
  const rawBody = String(event.body || '');
  if (event.httpMethod !== 'POST') return json(405,{ok:false,message:'Método não permitido.'});
  if (!verifySignature(event, rawBody)) return json(401,{ok:false,message:'Assinatura do webhook do Bling inválida.'});

  let payload={};
  try { payload=JSON.parse(rawBody || '{}'); } catch { return json(400,{ok:false,message:'Payload JSON inválido.'}); }

  const eventName=String(payload.event||'');
  const data=payload.data||{};
  if (eventName !== 'order.updated') return json(200,{ok:true,ignored:true,event:eventName});
  const blingOrderId=String(data.id||'').trim();
  if (!blingOrderId) return json(200,{ok:true,ignored:true,reason:'Pedido sem id.'});

  // O Bling envia somente um resumo no webhook. Buscamos o pedido completo
  // para ler transporte.frete e RELPPS_META com segurança.
  try {
    const bling=await getSaleOrder(blingOrderId);
    const note=String(bling?.observacoesInternas||'');
    const match=note.match(/RELPPS_META:(\{[^\n]*\})/);
    let meta={};
    if (match) { try { meta=JSON.parse(match[1])||{}; } catch {} }
    if (meta.method !== 'uber') return json(200,{ok:true,ignored:true,reason:'Pedido não é Uber.',blingOrderId});
    const freight=Number(bling?.transporte?.frete||0);
    if (!(freight>0)) return json(200,{ok:true,ignored:true,reason:'Frete ainda não lançado.',blingOrderId});

    const localId=String(bling.numeroLoja||data.numeroLoja||'').trim();
    if (!localId) return json(200,{ok:true,ignored:true,reason:'Pedido sem numeroLoja Relpps.',blingOrderId});

    const result=await syncUberFreightForOrder(localId);
    console.log('[Bling webhook] frete Uber sincronizado:', localId, result?.paymentUrl || 'sem pagamento');
    return json(200,{ok:true,processed:true,order:localId,paymentUrl:result?.paymentUrl||null});
  } catch (e) {
    console.error('[Bling webhook] processamento:', e);
    // Retornamos 200 para evitar tempestade de retries quando o evento é legítimo
    // mas o processamento depende de um serviço temporariamente indisponível.
    // O log do Netlify registra a falha para diagnóstico.
    return json(200,{ok:true,processed:false,message:e.message||'Falha temporária no processamento.'});
  }
};
