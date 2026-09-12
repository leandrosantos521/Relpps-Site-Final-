const BLING_BASE = 'https://api.bling.com.br/Api/v3';
const { getBlingOAuth, saveBlingOAuth } = require('./bling-oauth-store');

function cleanDoc(v){ return String(v || '').replace(/\D/g,''); }

async function getAccessToken(){
  const access=process.env.BLING_ACCESS_TOKEN;
  if(access) return access;
  let stored=null;
  try{ stored=await getBlingOAuth(); }catch(e){ console.warn('Falha ao ler OAuth do Bling no Supabase:',e.message); }
  if(stored?.access_token && stored?.expires_at && Date.now()<new Date(stored.expires_at).getTime()-60000) return stored.access_token;
  const refresh=stored?.refresh_token || process.env.BLING_REFRESH_TOKEN;
  const clientId=process.env.BLING_CLIENT_ID;
  const clientSecret=process.env.BLING_CLIENT_SECRET;
  if(!refresh||!clientId||!clientSecret) throw new Error('Bling não configurado no Netlify: BLING_REFRESH_TOKEN/CLIENT_ID/CLIENT_SECRET.');
  const basic=Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh});
  const r=await fetch(`${BLING_BASE}/oauth/token`,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json','enable-jwt':'1'},body});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.description || data?.message || `Bling OAuth HTTP ${r.status}`);
  data.saved_at=new Date().toISOString(); if(data.expires_in) data.expires_at=new Date(Date.now()+Number(data.expires_in)*1000).toISOString();
  try{ await saveBlingOAuth(data); }catch(e){ console.warn('Falha ao salvar OAuth do Bling:',e.message); }
  return data.access_token;
}

async function blingFetch(path, options={}){
  const token = await getAccessToken();
  const headers={Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json','enable-jwt':'1',...(options.headers||{})};
  const r=await fetch(`${BLING_BASE}${path}`,{...options,headers});
  const text=await r.text();
  let data={}; try{data=JSON.parse(text)}catch{}
  if(!r.ok) throw new Error(data?.error?.description || data?.message || `Bling HTTP ${r.status}`);
  return data;
}

async function getProduct(id){
  const data=await blingFetch(`/produtos/${encodeURIComponent(id)}`);
  return data?.data || data || {};
}

async function findOrCreateContact(customer, delivery){
  const cpf=cleanDoc(customer?.cpf);
  let contact=null;
  if(cpf){
    const found=await blingFetch(`/contatos?numeroDocumento=${encodeURIComponent(cpf)}&limite=10`);
    const rows=Array.isArray(found?.data)?found.data:[];
    contact=rows.find(x=>cleanDoc(x?.numeroDocumento)===cpf) || rows[0] || null;
  }
  if(contact?.id) return contact;

  const cityParts=String(delivery?.city||'').split('/');
  const payload={
    nome:String(customer?.name||'Cliente Relpps').trim(),
    tipoPessoa:'F',
    numeroDocumento:cpf,
    email:String(customer?.email||'').trim(),
    telefone:String(customer?.phone||'').replace(/\D/g,''),
    endereco:{
      geral:{
        endereco:String(delivery?.address||''),
        numero:String(delivery?.number||''),
        complemento:String(delivery?.complement||''),
        bairro:String(delivery?.district||''),
        municipio:String(cityParts[0]||delivery?.city||'').trim(),
        uf:String(cityParts[1]||'').trim(),
        cep:String(delivery?.cep||'').replace(/\D/g,'')
      }
    }
  };
  const created=await blingFetch('/contatos',{method:'POST',body:JSON.stringify(payload)});
  return created?.data || created;
}

async function findPaymentForm(type){
  const envKey = type==='pix'?'BLING_FORMA_PAGAMENTO_PIX_ID':type==='card'?'BLING_FORMA_PAGAMENTO_CARTAO_ID':'BLING_FORMA_PAGAMENTO_DINHEIRO_ID';
  if(process.env[envKey]) return Number(process.env[envKey]);
  const tipoPagamento = type==='pix'?17:type==='card'?3:1;
  const data=await blingFetch(`/formas-pagamentos?pagina=1&limite=100&tiposPagamentos[]=${tipoPagamento}&situacao=1`);
  const rows=Array.isArray(data?.data)?data.data:[];
  const preferred=type==='pix'?/pix|instantâneo/i:type==='card'?/cart[aã]o.*cr[eé]dito|cr[eé]dito/i:/dinheiro/i;
  const hit=rows.find(x=>preferred.test(String(x?.descricao||''))) || rows[0];
  return hit?.id ? Number(hit.id) : null;
}

function situationId(name){
  const key=name==='pending'?'BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID':'BLING_SITUACAO_PAGO_ID';
  return process.env[key] ? Number(process.env[key]) : null;
}

async function setOrderSituation(orderId, situationIdValue){
  if(!orderId || !situationIdValue) return {skipped:true};
  try{
    return await blingFetch(`/pedidos/vendas/${encodeURIComponent(orderId)}/situacoes/${encodeURIComponent(situationIdValue)}`,{method:'PATCH',body:JSON.stringify({})});
  }catch(e){
    // Some accounts expose the same transition through PUT. Keep a safe fallback.
    const detail=await blingFetch(`/pedidos/vendas/${encodeURIComponent(orderId)}`);
    const current=detail?.data||detail||{};
    current.situacao={id:Number(situationIdValue)};
    return await blingFetch(`/pedidos/vendas/${encodeURIComponent(orderId)}`,{method:'PUT',body:JSON.stringify(current)});
  }
}

function productPrice(product){
  return Number(product?.preco ?? product?.precoVenda ?? product?.precoVendaVarejo ?? 0);
}
function productStock(product){
  return Number(product?.estoque?.saldoVirtualTotal ?? product?.estoque?.saldoFisicoTotal ?? product?.estoque?.saldo ?? product?.saldoVirtual ?? product?.saldo ?? 0);
}

async function createSaleOrder({orderId,customer,delivery,items,totals,payment,discounts,relppsMeta={}}){
  const contact=await findOrCreateContact(customer,delivery);
  if(!contact?.id) throw new Error('Não foi possível localizar/criar o cliente no Bling.');

  const authoritative=[];
  for(const item of items){
    const productId=item.productId ?? item.id;
    if(!productId) throw new Error(`Produto sem ID no pedido: ${item.name||"item"}.`);
    const product=await getProduct(productId);
    const stock=productStock(product);
    const qty=Math.max(1,Number(item.quantity)||1);
    if(stock < qty) throw new Error(`Estoque insuficiente para ${product?.nome || item.name || item.id}. Disponível: ${stock}.`);
    authoritative.push({item,product,unitPrice:productPrice(product)});
  }

  // O frontend já calcula as regras comerciais. Aqui apenas aplicamos os mesmos descontos
  // sobre preços confirmados no Bling, evitando que o navegador altere o preço final.
  const paymentKind=payment==='pix_online'?'pix':payment==='card'?'card':'cash';
  const baseSubtotal=authoritative.reduce((s,x)=>s+x.unitPrice*Math.max(1,Number(x.item.quantity)||1),0);
  let automaticDiscount=0;
  const automaticItems=[];
  if(baseSubtotal>=100 && (paymentKind==='pix'||paymentKind==='cash')){
    for(const x of authoritative){
      const rate=/cola/i.test(String(x.product?.nome||x.item?.name||''))?0.03:0.05;
      const amount=x.unitPrice*Math.max(1,Number(x.item.quantity)||1)*rate;
      automaticDiscount+=amount;
      automaticItems.push({name:String(x.product?.nome||x.item?.name||'Produto'),rate,amount});
    }
  }

  let couponDiscount=0;
  if(discounts?.coupon && Number(discounts.coupon)>0){
    couponDiscount=Math.min(Number(discounts.coupon),Math.max(0,baseSubtotal-automaticDiscount));
  }
  const shipping=delivery?.shipping?.price ? Number(delivery.shipping.price) : 0;
  const total=Math.max(0,baseSubtotal-automaticDiscount-couponDiscount+shipping);
  const paymentFormId=await findPaymentForm(paymentKind);
  const pendingSituation=situationId('pending');

  const saleItems=authoritative.map(x=>{
    const qty=Math.max(1,Number(x.item.quantity)||1);
    const rate=/cola/i.test(String(x.product?.nome||x.item?.name||''))?0.03:0.05;
    const itemDiscount=(baseSubtotal>=100&&(paymentKind==='pix'||paymentKind==='cash')) ? x.unitPrice*qty*rate : 0;
    return {
      quantidade:qty,
      valor:Number(x.unitPrice.toFixed(2)),
      descricao:String(x.product?.nome||x.item?.name||'Produto'),
      codigo:String(x.product?.codigo||''),
      unidade:String(x.product?.unidade||'UN'),
      desconto:Number(itemDiscount.toFixed(2)),
      produto:{id:Number(x.product?.id||x.item.productId||x.item.id)}
    };
  });

  const order={
    ...(pendingSituation?{situacao:{id:pendingSituation}}:{}),
    contato:{id:Number(contact.id),nome:String(contact.nome||customer.name||'Cliente'),tipoPessoa:'F',numeroDocumento:String(contact.numeroDocumento||customer.cpf||'').replace(/\D/g,'')},
    itens:saleItems,
    parcelas:paymentFormId?[{dataVencimento:new Date(Date.now()+24*60*60*1000).toISOString().slice(0,10),valor:Number(total.toFixed(2)),formaPagamento:{id:paymentFormId},observacoes:`Relpps ${paymentKind.toUpperCase()} | Pedido online ${orderId} | Aguardando pagamento`}]:[],
    data:new Date().toISOString().slice(0,10),
    numeroLoja:orderId,
    totalProdutos:Number(baseSubtotal.toFixed(2)),
    total:Number(total.toFixed(2)),
    desconto:{valor:Number((automaticDiscount+couponDiscount).toFixed(2)),unidade:'REAL'},
    observacoes:`Pedido online Relpps ${orderId} | ${paymentKind==='cash'?'DINHEIRO NA RETIRADA':paymentKind==='pix'?'PIX ONLINE':'CARTÃO ONLINE'} | Status: Aguardando pagamento`,
    observacoesInternas:`Desconto automático: R$ ${automaticDiscount.toFixed(2)} | Cupom: R$ ${couponDiscount.toFixed(2)} | Frete: R$ ${shipping.toFixed(2)} | Gateway: ${paymentKind==='cash'?'não utilizado':'InfinitePay'} | RELPPS_META:${JSON.stringify({method:relppsMeta.method||delivery?.method||'delivery',payment:relppsMeta.payment||payment,fulfillmentStatus:relppsMeta.fulfillmentStatus||'Aguardando pagamento'})}`,
    transporte:{
      fretePorConta:1,
      frete:Number(shipping.toFixed(2)),
      etiqueta:{
        nome:String(customer?.name||''),endereco:String(delivery?.address||''),numero:String(delivery?.number||''),complemento:String(delivery?.complement||''),municipio:String(delivery?.city||'').split('/')[0].trim(),uf:String(delivery?.city||'').split('/')[1]?.trim()||'',cep:String(delivery?.cep||'').replace(/\D/g,''),bairro:String(delivery?.district||''),nomePais:'Brasil'
      }
    }
  };

  const created=await blingFetch('/pedidos/vendas',{method:'POST',body:JSON.stringify(order)});
  const data=created?.data||created||{};
  return {id:data.id,number:data.numero,payload:order,calculated:{subtotal:baseSubtotal,automaticDiscount,couponDiscount,shipping,total,automaticItems}};
}

async function findSaleOrderByStoreNumber(orderNumber){
  const needle=String(orderNumber||'').trim();
  if(!needle) return null;
  const q=new URLSearchParams({pagina:'1',limite:'100'});
  q.append('numerosLojas[]',needle);
  const data=await blingFetch(`/pedidos/vendas?${q.toString()}`);
  const rows=Array.isArray(data?.data)?data.data:[];
  return rows.find(x=>String(x?.numeroLoja||'')===needle) || rows[0] || null;
}

async function getSaleOrder(id){
  if(!id) return null;
  const data=await blingFetch(`/pedidos/vendas/${encodeURIComponent(id)}`);
  return data?.data || data || null;
}

module.exports={blingFetch,getProduct,productPrice,productStock,createSaleOrder,setOrderSituation,situationId,cleanDoc,findSaleOrderByStoreNumber,getSaleOrder};
