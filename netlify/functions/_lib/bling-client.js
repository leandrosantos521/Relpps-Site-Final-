const BLING_BASE = 'https://api.bling.com.br/Api/v3';
const { getBlingOAuth, saveBlingOAuth, clearBlingOAuth } = require('./bling-oauth-store');

function cleanDoc(v){ return String(v || '').replace(/\D/g,''); }
function validCPF(v){
  const cpf=cleanDoc(v);
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum=0; for(let i=0;i<9;i++) sum+=Number(cpf[i])*(10-i);
  let d1=(sum*10)%11; if(d1===10) d1=0;
  if(d1!==Number(cpf[9])) return false;
  sum=0; for(let i=0;i<10;i++) sum+=Number(cpf[i])*(11-i);
  let d2=(sum*10)%11; if(d2===10) d2=0;
  return d2===Number(cpf[10]);
}
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim()); }
function validUF(v){ return /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i.test(String(v||'').trim()); }

async function getAccessToken(){
  const access=process.env.BLING_ACCESS_TOKEN;
  if(access) return access;
  let stored=null;
  try{ stored=await getBlingOAuth(); }catch(e){ console.warn('Falha ao ler OAuth do Bling no Supabase:',e.message); }
  if(stored?.access_token && stored?.expires_at && Date.now()<new Date(stored.expires_at).getTime()-60000) return stored.access_token;
  const refresh=stored?.refresh_token || process.env.BLING_REFRESH_TOKEN;
  const clientId=process.env.BLING_CLIENT_ID;
  const clientSecret=process.env.BLING_CLIENT_SECRET;
  if(!refresh||!clientId||!clientSecret){ const e=new Error('Bling ainda não está conectado. Conecte sua conta do Bling para continuar.'); e.statusCode=409; e.code='BLING_CONNECTION_REQUIRED'; e.reconnectUrl='/api/bling?action=authorize'; throw e; }
  const basic=Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh});
  const r=await fetch(`${BLING_BASE}/oauth/token`,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json','enable-jwt':'1'},body});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.description || data?.message || `Bling OAuth HTTP ${r.status}`);
  data.saved_at=new Date().toISOString(); if(data.expires_in) data.expires_at=new Date(Date.now()+Number(data.expires_in)*1000).toISOString();
  await saveBlingOAuth(data);
  return data.access_token;
}

async function blingFetch(path, options={}, attempt=0){
  const token = await getAccessToken();
  const headers={Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json','enable-jwt':'1',...(options.headers||{})};
  const r=await fetch(`${BLING_BASE}${path}`,{...options,headers});
  const text=await r.text();
  let data={}; try{data=JSON.parse(text)}catch{}

  if((r.status===401 || r.status===429 || r.status>=500) && attempt<2){
    if(r.status===401 && !process.env.BLING_ACCESS_TOKEN){
      try{
        const stored=await getBlingOAuth();
        const refresh=stored?.refresh_token || process.env.BLING_REFRESH_TOKEN;
        if(refresh) await (async()=>{
          const clientId=process.env.BLING_CLIENT_ID, clientSecret=process.env.BLING_CLIENT_SECRET;
          const basic=Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh});
          const rr=await fetch(`${BLING_BASE}/oauth/token`,{method:'POST',headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json','enable-jwt':'1'},body});
          const dd=await rr.json().catch(()=>({}));
          if(!rr.ok) throw new Error(dd?.error?.description||dd?.message||`Bling OAuth HTTP ${rr.status}`);
          dd.saved_at=new Date().toISOString(); if(dd.expires_in) dd.expires_at=new Date(Date.now()+Number(dd.expires_in)*1000).toISOString();
          await saveBlingOAuth(dd);
        })();
      }catch(e){ if(attempt>=1) throw e; }
    }
    const retryAfter=Number(r.headers.get('retry-after')||0);
    await new Promise(res=>setTimeout(res,retryAfter>0?retryAfter*1000:700*(attempt+1)));
    return blingFetch(path,options,attempt+1);
  }

  if(!r.ok){
    if(r.status===403){
      const needed=/pedidos\/vendas/i.test(path)?'Pedido de Venda (order)':/produtos/i.test(path)?'Produtos (product)':/estoques/i.test(path)?'Estoque (stock)':/contatos/i.test(path)?'Contatos (contact)':/formas-pagamentos/i.test(path)?'Formas de pagamento (finance)':'o escopo correspondente';
      try{ if(!process.env.BLING_ACCESS_TOKEN) await clearBlingOAuth(); }catch(e){ console.warn('[Bling] Não foi possível limpar autorização antiga:',e.message); }
      const err=new Error(`A conexão do Bling não possui o escopo necessário para ${needed}. Autorize o aplicativo novamente.`); err.statusCode=409; err.code='BLING_REAUTHORIZE_REQUIRED'; err.blingStatus=403; err.reconnectUrl='/api/bling?action=authorize'; err.path=path;
      throw err;
    }
    const detail=data?.error?.description || data?.error?.message || data?.message || data?.description || '';
    const fieldDetail=Array.isArray(data?.error?.fields)?data.error.fields.map(f=>`${f?.field||''}: ${f?.message||f?.description||''}`).filter(Boolean).join(' | '):'';
    const err=new Error(`${detail||`Bling HTTP ${r.status}`}${fieldDetail?` — ${fieldDetail}`:''}`); err.statusCode=r.status; err.blingStatus=r.status; err.blingResponse=data; throw err;
  }
  return data;
}

async function getProduct(id){
  const data=await blingFetch(`/produtos/${encodeURIComponent(id)}`);
  return data?.data || data || {};
}

async function findOrCreateContact(customer, delivery){
  const rawCpf=String(customer?.cpf||'').trim();
  const cpf=cleanDoc(rawCpf);
  const cpfOk=validCPF(cpf);
  const email=String(customer?.email||'').trim().toLowerCase();
  if(email && !validEmail(email)) throw new Error('E-mail inválido. Informe um e-mail válido para criar o cliente no Bling.');
  const phone=String(customer?.phone||'').replace(/\D/g,'');
  if(phone && (phone.length<10 || phone.length>11)) throw new Error('Telefone inválido. Informe um telefone com DDD.');

  // 1) Primeiro tenta localizar por CPF. Se o navegador entregou um valor
  // formatado, cleanDoc() normaliza antes da consulta.
  let contact=null;
  if(cpfOk){
    const found=await blingFetch(`/contatos?numeroDocumento=${encodeURIComponent(cpf)}&limite=10`);
    const rows=Array.isArray(found?.data)?found.data:[];
    contact=rows.find(x=>cleanDoc(x?.numeroDocumento)===cpf) || rows[0] || null;
  }

  // 2) Fallback por e-mail: evita criar duplicado e também permite concluir
  // pedidos de clientes cujo CPF foi digitado com algum problema de máscara.
  if(!contact?.id && email){
    try{
      const found=await blingFetch(`/contatos?email=${encodeURIComponent(email)}&limite=10`);
      const rows=Array.isArray(found?.data)?found.data:[];
      contact=rows.find(x=>String(x?.email||'').trim().toLowerCase()===email) || rows[0] || null;
    }catch(e){
      // Alguns ambientes/escopos podem não expor o filtro por e-mail. Não
      // interrompemos o pedido se a consulta opcional falhar.
      console.warn('[Bling contato] busca por e-mail falhou:',e.message);
    }
  }
  if(contact?.id) return contact;

  const cityParts=String(delivery?.city||'').split('/');
  const municipio=String(cityParts[0]||delivery?.city||'').trim();
  const uf=String(delivery?.uf||cityParts[1]||'').trim().toUpperCase();
  const cep=String(delivery?.cep||'').replace(/\D/g,'');
  if(!municipio) throw new Error('Município do cliente não informado.');
  if(!validUF(uf)) throw new Error('UF do endereço inválida. Informe o estado corretamente, por exemplo: Brasília / DF.');
  if(cep.length!==8 && !['pickup','pickup_uber'].includes(String(delivery?.method||''))) throw new Error('CEP inválido. Informe um CEP com 8 dígitos.');

  const geral={
    endereco:String(delivery?.address||'').trim(),
    numero:String(delivery?.number||'').trim(),
    complemento:String(delivery?.complement||'').trim(),
    bairro:String(delivery?.district||'').trim(),
    municipio,
    uf
  };
  if(cep.length===8) geral.cep=cep;

  const payload={
    nome:String(customer?.name||'Cliente Relpps').trim(),
    tipoPessoa:'F',
    ...(cpfOk?{numeroDocumento:cpf}:{}),
    ...(email?{email,emailNotaFiscal:email}:{}),
    ...(phone?{telefone:phone}:{}),
    endereco:{geral}
  };

  try{
    const created=await blingFetch('/contatos',{method:'POST',body:JSON.stringify(payload)});
    return created?.data || created;
  }catch(firstError){
    // Segunda tentativa: payload mínimo e limpo. Isso cobre contas Bling que
    // rejeitam campos opcionais vazios ou alguma combinação de endereço.
    const minimal={
      nome:payload.nome,
      tipoPessoa:'F',
      ...(cpfOk?{numeroDocumento:cpf}:{}),
      ...(email?{email}:{}),
      ...(phone?{telefone:phone}:{}),
      ...(geral.endereco?{endereco:{geral}}:{})
    };
    try{
      const created=await blingFetch('/contatos',{method:'POST',body:JSON.stringify(minimal)});
      return created?.data || created;
    }catch(secondError){
      // Última tentativa de recuperação: o contato pode ter sido criado na
      // primeira chamada e a resposta ter falhado. Reconsulta por CPF/e-mail.
      if(cpfOk){
        try{
          const found=await blingFetch(`/contatos?numeroDocumento=${encodeURIComponent(cpf)}&limite=10`);
          const rows=Array.isArray(found?.data)?found.data:[];
          const recovered=rows.find(x=>cleanDoc(x?.numeroDocumento)===cpf)||rows[0];
          if(recovered?.id) return recovered;
        }catch{}
      }
      if(email){
        try{
          const found=await blingFetch(`/contatos?email=${encodeURIComponent(email)}&limite=10`);
          const rows=Array.isArray(found?.data)?found.data:[];
          const recovered=rows.find(x=>String(x?.email||'').trim().toLowerCase()===email)||rows[0];
          if(recovered?.id) return recovered;
        }catch{}
      }
      const detail=String(secondError?.message||firstError?.message||'Falha ao cadastrar contato no Bling.');
      throw new Error(`O Bling recusou o cadastro do cliente: ${detail}`);
    }
  }
}

async function findPaymentForm(type){
  const envKey = type==='pix'?'BLING_FORMA_PAGAMENTO_PIX_ID':type==='card'?'BLING_FORMA_PAGAMENTO_CARTAO_ID':'BLING_FORMA_PAGAMENTO_DINHEIRO_ID';
  if(process.env[envKey]) return Number(process.env[envKey]);
  const tipoPagamento = type==='pix'?17:type==='card'?3:1;
  try{
    const data=await blingFetch(`/formas-pagamentos?pagina=1&limite=100&tiposPagamentos[]=${tipoPagamento}&situacao=1`);
    const rows=Array.isArray(data?.data)?data.data:[];
    const preferred=type==='pix'?/pix|instantâneo/i:type==='card'?/cart[aã]o.*cr[eé]dito|cr[eé]dito/i:/dinheiro/i;
    const hit=rows.find(x=>preferred.test(String(x?.descricao||''))) || rows[0];
    return hit?.id ? Number(hit.id) : null;
  }catch(e){
    // O checkout da Relpps é liquidado pela InfinitePay. A forma de pagamento
    // do Bling é apenas informativa e não pode impedir a criação do pedido.
    if(e?.blingStatus===403 || e?.statusCode===409) return null;
    throw e;
  }
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
  // Idempotência: se o checkout for reenviado, reaproveita o pedido já criado
  // no Bling em vez de gerar dois pedidos de venda.
  if(orderId){
    try{
      const existing=await findSaleOrderByStoreNumber(orderId);
      if(existing?.id){
        return {id:existing.id,number:existing.numero,payload:existing,calculated:{
          subtotal:Number(existing.totalProdutos||0),
          automaticDiscount:Number(existing.desconto?.valor||0),
          couponDiscount:0,
          shipping:Number(existing.transporte?.frete||0),
          total:Number(existing.total||0),
          automaticItems:[]
        },reused:true};
      }
    }catch(e){ console.warn('[Bling] consulta de idempotência falhou; prosseguindo:',e.message); }
  }
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
  const paymentKind=payment==='pix_online'?'pix':payment==='card'?'card':payment==='pending'?'pending':'cash';
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
  const paymentFormId=paymentKind==='pending'?null:await findPaymentForm(paymentKind);
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
    observacoes:`Pedido online Relpps ${orderId} | ${paymentKind==='pending'?'PAGAMENTO APÓS COTAÇÃO':paymentKind==='cash'?'DINHEIRO NA RETIRADA':paymentKind==='pix'?'PIX ONLINE':'CARTÃO ONLINE'} | Status: Aguardando pagamento | Frete: ${shipping>0?`R$ ${shipping.toFixed(2)}`:(delivery?.method==='uber'?'A CALCULAR — UBER DIRECT':'A CALCULAR NO MELHOR ENVIO')}`,
    observacoesInternas:`Desconto automático: R$ ${automaticDiscount.toFixed(2)} | Cupom: R$ ${couponDiscount.toFixed(2)} | Frete: ${shipping>0?`R$ ${shipping.toFixed(2)}`:(delivery?.method==='uber'?"A CALCULAR — UBER ENTREGAS":"A CALCULAR NO MELHOR ENVIO")} | Gateway: ${paymentKind==='cash'?'não utilizado':paymentKind==='pending'?'aguardando cotação':'InfinitePay'} | RELPPS_META:${JSON.stringify({method:relppsMeta.method||delivery?.method||'delivery',payment:relppsMeta.payment||payment,fulfillmentStatus:relppsMeta.fulfillmentStatus||'Aguardando pagamento'})}`,
    transporte:{
      fretePorConta:1,
      frete:Number(shipping.toFixed(2)),
      etiqueta:{
        nome:String(customer?.name||''),endereco:String(delivery?.address||''),numero:String(delivery?.number||''),complemento:String(delivery?.complement||''),municipio:String(delivery?.city||'').split('/')[0].trim(),uf:String(delivery?.city||'').split('/')[1]?.trim()||'',cep:String(delivery?.cep||'').replace(/\D/g,''),bairro:String(delivery?.district||''),nomePais:'Brasil'
      }
    }
  };

  let created;
  try{
    created=await blingFetch('/pedidos/vendas',{method:'POST',body:JSON.stringify(order)});
  }catch(firstError){
    // Se a resposta do POST se perdeu, o Bling pode ter criado o pedido mesmo assim.
    // Reconsultamos pelo numeroLoja antes de devolver erro ao cliente.
    try{
      const recovered=await findSaleOrderByStoreNumber(orderId);
      if(recovered?.id) return {id:recovered.id,number:recovered.numero,payload:recovered,calculated:{subtotal:baseSubtotal,automaticDiscount,couponDiscount,shipping,total,automaticItems},recovered:true};
    }catch{}
    throw firstError;
  }
  let data=created?.data||created||{};
  if(!data?.id){
    const recovered=await findSaleOrderByStoreNumber(orderId);
    if(recovered?.id) data=recovered;
    else throw new Error('O Bling recebeu a criação, mas não retornou o ID do Pedido de Venda.');
  }
  // Confirmação final: lê o pedido recém-criado na API. Isso garante que o ID
  // retornado realmente corresponde ao Pedido de Venda que ficará no Bling.
  let confirmed=data;
  try{
    const check=await getSaleOrder(data.id);
    if(check?.id) confirmed=check;
  }catch(e){ console.warn('[Bling] pedido criado, mas confirmação GET falhou:',e.message); }
  return {id:confirmed.id,number:confirmed.numero||data.numero,payload:order,calculated:{subtotal:baseSubtotal,automaticDiscount,couponDiscount,shipping,total,automaticItems}};
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

async function updateSaleOrderFreight(orderId,{price,total,provider,label,service,paid=false}={}){
  const current=await getSaleOrder(orderId);
  if(!current?.id) throw new Error('Pedido de venda não encontrado no Bling.');
  const freight=Number(Number(price||0).toFixed(2));
  const next={...current,
    total:Number(Number(total??current.total??0).toFixed(2)),
    transporte:{...(current.transporte||{}),fretePorConta:1,frete:freight},
    observacoes:`${String(current.observacoes||'').replace(/\s*\|\s*Frete:[^|\n]*/i,'')} | Frete: ${label||provider||'Entrega'}${service?` (${service})`:''} R$ ${freight.toFixed(2)} | ${paid?'Frete pago':'Aguardando pagamento do frete'}`,
    observacoesInternas:`${String(current.observacoesInternas||'').replace(/\s*\|\s*Frete:[^|\n]*/i,'').replace(/RELPPS_FREIGHT_META:\{[^\n]*\}/,'').trim()} | Frete: ${label||provider||'Entrega'} R$ ${freight.toFixed(2)} | ${paid?'PAGO':'AGUARDANDO PAGAMENTO'} | RELPPS_FREIGHT_META:${JSON.stringify({provider,label,service,price:freight,paid:Boolean(paid),payment:current?.observacoesInternas?.match(/RELPPS_FREIGHT_PAYMENT:(\{[^\n]*\})/)?.[1]||null})}`
  };
  return await blingFetch(`/pedidos/vendas/${encodeURIComponent(orderId)}`,{method:'PUT',body:JSON.stringify(next)});
}

module.exports={blingFetch,getProduct,productPrice,productStock,createSaleOrder,setOrderSituation,situationId,cleanDoc,findSaleOrderByStoreNumber,getSaleOrder,updateSaleOrderFreight};
