const {createSaleOrder,setOrderSituation,situationId,findSaleOrderByStoreNumber,getSaleOrder,updateSaleOrderFreight}=require('./_lib/bling-client');
const {getOrder,insertOrder,updateOrder,getCoupon,markCouponUsed}=require('./_lib/store');
const crypto=require('crypto');
const {createDelivery: createUberDelivery,quote: quoteUberDelivery}=require('./_lib/uber-direct');

function json(statusCode,body,headers={}){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers},body:JSON.stringify(body)}}
function orderId(){return `REL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`}
function isProduction(){return process.env.CHECKOUT_TEST_MODE==='false'}
function publicBaseUrl(){return String(process.env.PUBLIC_SITE_URL||'https://relppscosmeticoss.netlify.app').replace(/\/$/,'')}
function storeConfigured(){return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)}
function money(v){return Number(Number(v||0).toFixed(2));}
function adminSecretOk(event,body={}){const expected=String(process.env.RELPPS_ADMIN_RELEASE_SECRET||'').trim(); const supplied=String(body.secret||event.headers?.['x-relpps-admin-secret']||event.headers?.['X-Relpps-Admin-Secret']||'').trim(); return Boolean(expected && supplied && supplied===expected);}

function verifyShippingQuoteToken(token,{provider,cep,price,service}){
  const secret=String(process.env.SHIPPING_QUOTE_SECRET||process.env.RELPPS_ADMIN_RELEASE_SECRET||'').trim();
  if(!secret) return {ok:!isProduction(),price:Number(price||0)};
  const parts=String(token||'').split('.'); if(parts.length!==2) return {ok:false};
  const [payload,sig]=parts; const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return {ok:false};
  let data={}; try{data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{return {ok:false}}
  if(data.provider!==provider || data.cep!==String(cep||'').replace(/\D/g,'') || Math.abs(Number(data.price)-Number(price))>0.01) return {ok:false};
  if(service && data.service && String(data.service)!==String(service)) return {ok:false};
  if(Number(data.expiresAt||0)<Date.now()) return {ok:false,expired:true};
  return {ok:true,price:Number(data.price||0),quoteId:data.quoteId||null};
}

function fulfillmentForCreate(method,payment){ if(method==='pickup_uber') return payment==='cash'?'Aguardando pagamento na retirada':'Aguardando pagamento'; if(method==='pickup') return payment==='cash'?'Aguardando pagamento na retirada':'Aguardando pagamento'; return 'Aguardando pagamento'; }

// Supabase continua sendo usado quando a tabela existe, mas o checkout não trava
// caso relpps_orders ainda não tenha sido criada. Nesse cenário, o Bling + InfinitePay
// formam a fonte de verdade do pedido/pagamento.
async function safeInsertOrder(row){ if(!storeConfigured()) return null; try{return await insertOrder(row);}catch(e){console.warn('[Checkout] Supabase relpps_orders indisponível; seguindo com Bling/InfinitePay:',e.message);return null;} }
async function safeUpdateOrder(id,patch){ if(!storeConfigured()) return null; try{return await updateOrder(id,patch);}catch(e){console.warn('[Checkout] Não foi possível atualizar relpps_orders:',e.message);return null;} }
async function safeGetOrder(id){ if(storeConfigured()){try{const row=await getOrder(id);if(row)return row;}catch(e){console.warn('[Checkout] Falha ao consultar relpps_orders:',e.message);}} return null; }

function parseRelppsMeta(order){
  const text=String(order?.observacoesInternas||'');
  const m=text.match(/RELPPS_META:(\{[^\n]*\})/);
  if(!m) return {};
  try{return JSON.parse(m[1])||{};}catch{return {};}
}
function blingToLocalOrder(order){
  if(!order) return null;
  const meta=parseRelppsMeta(order);
  const freightText=String(order?.observacoesInternas||'');
  const fm=freightText.match(/RELPPS_FREIGHT_META:(\{[^\n]*\})/);
  let freightMeta={}; try{if(fm) freightMeta=JSON.parse(fm[1])||{};}catch{}
  const label=order.transporte?.etiqueta||{};
  return {
    id:String(order.numeroLoja||order.id),
    status:meta.paid?'PAID':'AWAITING_PAYMENT',
    payment_status:meta.paid?'APPROVED':'AWAITING_PAYMENT',
    payment_method:meta.payment||'card',
    bling_order_id:order.id,
    totals:{total:Number(order.total||0),subtotal:Number(order.totalProdutos||0),shipping:Number(order.transporte?.frete||0)},
    delivery:{method:meta.method||'delivery',cep:label.cep||'',address:label.endereco||'',number:label.numero||'',complement:label.complemento||'',district:label.bairro||'',city:label.municipio?`${label.municipio}${label.uf?` / ${label.uf}`:''}`:'',shipping:{...freightMeta}},
    raw:{fulfillmentStatus:freightMeta.paid?'Liberado para entrega':(meta.paid?(meta.method==='pickup_uber'?'Aguardando liberação da loja':(meta.method==='pickup'?'Liberado para retirada':'Aguardando pagamento do frete')):(meta.fulfillmentStatus||'Aguardando pagamento')),bling:order,freight:freightMeta,freightPayment:freightMeta.payment||null}
  };
}
async function resolveOrder(orderId){
  const local=await safeGetOrder(orderId);
  if(local) return local;
  try{const found=await findSaleOrderByStoreNumber(orderId);return blingToLocalOrder(found);}catch(e){console.warn('[Checkout] Não foi possível localizar pedido no Bling:',e.message);return null;}
}

async function infinitePay(path, options={}){
  const r=await fetch(`https://api.checkout.infinitepay.io${path}`,{
    ...options,
    headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}
  });
  const text=await r.text();
  let data={}; try{data=JSON.parse(text)}catch{}
  if(!r.ok) throw new Error(data?.message||data?.error||`InfinitePay HTTP ${r.status}`);
  return data;
}

const DEFAULT_INFINITEPAY_HANDLE='rps210323';
function infinitePayHandle(){
  return String(process.env.INFINITEPAY_HANDLE||DEFAULT_INFINITEPAY_HANDLE).replace(/^\$/,'').trim();
}
function infinitePayConfigured(){
  return Boolean(infinitePayHandle());
}

async function createInfinitePayCheckout(order){
  const handle=infinitePayHandle();
  if(!handle) throw new Error('InfinitePay não configurado.');

  const total=money(order.totals?.total||0);
  if(total<=0) throw new Error('O total do pedido precisa ser maior que zero.');

  // A InfinitePay recebe preços em centavos. Usamos um item único com o total final
  // para garantir que descontos + cupom + frete cheguem exatamente ao gateway.
  const payload={
    handle,
    items:[{
      quantity:1,
      price:Math.round(total*100),
      description:`Pedido Relpps ${order.id}`
    }],
    order_nsu:String(order.id),
    redirect_url:`${publicBaseUrl()}/${isPickupMethodServer(order.delivery?.method)?`retirada.html?order=${encodeURIComponent(order.id)}`:`?checkout=infinitepay-return&order=${encodeURIComponent(order.id)}`}`,
    webhook_url:`${publicBaseUrl()}/.netlify/functions/checkout?action=infinitepay-webhook`,
    customer:{
      name:String(order.customer?.name||'').trim(),
      email:String(order.customer?.email||'').trim(),
      phone_number:(()=>{const d=String(order.customer?.phone||'').replace(/\D/g,'');return d?`+55${d.replace(/^55/,'')}`:''})()
    }
  };

  const delivery=order.delivery||{};
  if(delivery.method!=='pickup' && delivery.method!=='pickup_uber' && delivery.cep){
    payload.address={
      cep:String(delivery.cep||'').replace(/\D/g,''),
      street:String(delivery.address||''),
      neighborhood:String(delivery.district||''),
      number:String(delivery.number||''),
      complement:String(delivery.complement||'')
    };
  }

  return infinitePay('/links',{method:'POST',body:JSON.stringify(payload)});
}

async function markBlingPaymentApproved(blingOrderId,payment){
  if(!blingOrderId) return null;
  let current=null;
  try{current=await getSaleOrder(blingOrderId);}catch(e){console.warn('[Bling paid] detalhe do pedido indisponível:',e.message);return null;}
  const currentNote=String(current?.observacoesInternas||'');
  const metaMatch=currentNote.match(/RELPPS_META:(\{[^\n]*\})/);
  let meta={};
  if(metaMatch){try{meta=JSON.parse(metaMatch[1])||{};}catch{}}
  meta.paid=true;
  meta.paidAt=new Date().toISOString();
  meta.transaction_nsu=String(payment?.transaction_nsu||'');
  meta.invoice_slug=String(payment?.slug||'');
  meta.capture_method=String(payment?.capture_method||'');
  meta.paid_amount=Number(payment?.paid_amount||0);
  const note=currentNote.replace(/RELPPS_META:\{[^\n]*\}/,'').trim();
  current.observacoesInternas=`${note}${note?' | ':''}Pagamento InfinitePay APROVADO | RELPPS_META:${JSON.stringify(meta)}`;
  try{return await require('./_lib/bling-client').blingFetch(`/pedidos/vendas/${encodeURIComponent(blingOrderId)}`,{method:'PUT',body:JSON.stringify(current)});}catch(e){console.warn('[Bling paid] não foi possível gravar marcador de pagamento:',e.message);return null;}
}

async function checkInfinitePayPayment({orderNsu,transactionNsu,slug}){
  const handle=infinitePayHandle();
  if(!handle) throw new Error('InfinitePay não configurado.');
  if(!orderNsu || !transactionNsu || !slug) throw new Error('Dados insuficientes para consultar o pagamento InfinitePay.');
  return infinitePay('/payment_check',{method:'POST',body:JSON.stringify({
    handle,order_nsu:String(orderNsu),transaction_nsu:String(transactionNsu),slug:String(slug)
  })});
}



async function createInfinitePayFreightCheckout(order, freight){
  const amount=money(freight?.price);
  if(amount<=0) throw new Error('O valor do frete precisa ser maior que zero.');
  const nsu=`${order.id}-FRETE`;
  const payload={
    handle:infinitePayHandle(),
    items:[{quantity:1,price:Math.round(amount*100),description:`Frete do pedido ${order.id}`}],
    order_nsu:nsu,
    redirect_url:`${publicBaseUrl()}/pedido.html?order=${encodeURIComponent(order.id)}`,
    webhook_url:`${publicBaseUrl()}/.netlify/functions/checkout?action=infinitepay-webhook`,
    customer:{
      name:String(order.customer?.name||'').trim(),
      email:String(order.customer?.email||'').trim(),
      phone_number:(()=>{const d=String(order.customer?.phone||'').replace(/\D/g,'');return d?`+55${d.replace(/^55/,'')}`:''})()
    }
  };
  return infinitePay('/links',{method:'POST',body:JSON.stringify(payload)});
}

function orderItemsForShipping(order){
  const items=Array.isArray(order.items)?order.items:(Array.isArray(order.raw?.items)?order.raw.items:[]);
  return items.map(i=>({
    id:String(i.productId??i.id??i.codigo??i.name??'item'),
    width:Number(i.width||i.raw?.width||i.dimensoes?.largura||i.raw?.dimensoes?.largura)||11,
    height:Number(i.height||i.raw?.height||i.dimensoes?.altura||i.raw?.dimensoes?.altura)||17,
    length:Number(i.length||i.raw?.length||i.dimensoes?.comprimento||i.raw?.dimensoes?.comprimento)||11,
    weight:Number(i.weight||i.raw?.weight||i.peso||i.raw?.peso)||.3,
    price:Number(i.price||i.unitPrice||i.valor||i.raw?.price||1),
    quantity:Number(i.quantity||i.qty||1)||1
  }));
}

async function melhorEnvioFreightQuote(order){
  const token=process.env.MELHOR_ENVIO_TOKEN;
  const from=String(process.env.STORE_POSTAL_CODE||'').replace(/\D/g,'').slice(0,8);
  const to=String(order.delivery?.cep||'').replace(/\D/g,'').slice(0,8);
  if(!token||from.length!==8||to.length!==8) throw new Error('Melhor Envio não configurado ou CEP inválido.');
  const base=process.env.MELHOR_ENVIO_SANDBOX==='true'?'https://sandbox.melhorenvio.com.br':'https://melhorenvio.com.br';
  const items=orderItemsForShipping(order);
  if(!items.length) throw new Error('O pedido não possui itens para cotar.');
  const payload={from:{postal_code:from},to:{postal_code:to},products:items.map(i=>({id:i.id,width:i.width,height:i.height,length:i.length,weight:i.weight,insurance_value:i.price,quantity:i.quantity})),options:{receipt:false,own_hand:false}};
  const r=await fetch(`${base}/api/v2/me/shipment/calculate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json','User-Agent':process.env.MELHOR_ENVIO_USER_AGENT||'Relpps Cosméticos (contato@relpps.com.br)'},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>[]);
  if(!r.ok) throw new Error(data?.message||'Falha na cotação do Melhor Envio.');
  return Array.isArray(data)?data.filter(x=>!x.error).map(x=>({id:x.id,name:x.name||x.service||'Entrega',company:x.company?.name||x.company||'Melhor Envio',price:money(x.custom_price??x.price),delivery_time:x.custom_delivery_time??x.delivery_time,raw:x})).filter(x=>x.price>0):[];
}

async function createFullOrderPayment(order){
  const checkout=await createInfinitePayCheckout(order);
  const paymentUrl=checkout?.url||checkout?.checkout_url||checkout?.payment_url||checkout?.link||checkout?.data?.url||null;
  if(!paymentUrl) throw new Error('A InfinitePay não retornou o link de pagamento.');
  return {checkout,paymentUrl};
}

async function syncUberFreightFromBling(event){
  let body={};try{body=JSON.parse(event.body||'{}')}catch{}
  if(!adminSecretOk(event,body)) return json(401,{message:'Não autorizado.'});
  const id=String(body.order||'').trim(); if(!id)return json(400,{message:'Informe o número do pedido.'});
  const order=await resolveOrder(id); if(!order)return json(404,{message:'Pedido não encontrado.'});
  if(order.delivery?.method!=='uber') return json(409,{message:'Este pedido não foi feito com Uber Entregas.'});
  if(!order.bling_order_id) return json(409,{message:'O pedido ainda não possui ID no Bling.'});
  const bling=await getSaleOrder(order.bling_order_id);
  const price=money(bling?.transporte?.frete||0);
  if(price<=0) return json(409,{message:'O Bling ainda não possui um valor de frete maior que zero para este pedido.'});
  const existingFreight=order.delivery?.shipping||{};
  const existingPayment=order.raw?.freightPayment||{};
  if(Number(existingFreight.price||0)===price && existingPayment.payment_url){
    return json(200,{ok:true,order:{id,freight:existingFreight,totals:order.totals,paymentUrl:existingPayment.payment_url},paymentUrl:existingPayment.payment_url,reused:true});
  }
  const subtotal=money(order.totals?.subtotal||bling?.totalProdutos||0);
  const discounts=money(order.totals?.automaticDiscount||0)+money(order.totals?.couponDiscount||0);
  const productTotal=Math.max(0,subtotal-discounts);
  const totals={...(order.totals||{}),subtotal,shipping:price,total:money(productTotal+price)};
  const freight={provider:'uber',price,label:'Uber Entregas',service:'manual_bling',paid:false,source:'bling',updatedAt:new Date().toISOString()};
  const delivery={...(order.delivery||{}),shipping:freight};
  const raw={...(order.raw||{}),delivery,totals,freight,fulfillmentStatus:'Aguardando pagamento',blingFreightSyncedAt:new Date().toISOString()};
  const fullOrder={...order,delivery,totals,customer:order.raw?.customer||order.customer,items:order.items||order.raw?.items||[],id:order.id};
  let paymentUrl=null,checkout=null;
  if(isProduction()) ({checkout,paymentUrl}=await createFullOrderPayment(fullOrder));
  const updated=await safeUpdateOrder(id,{delivery,totals,payment_url:paymentUrl,raw:{...raw,freightPayment:{payment_url:paymentUrl,checkout,order_nsu:id}}});
  return json(200,{ok:true,order:{id,freight,totals,paymentUrl},paymentUrl});
}

async function calculateFreight(event){
  let body={};try{body=JSON.parse(event.body||'{}')}catch{}
  if(!adminSecretOk(event,body)) return json(401,{message:'Não autorizado.'});
  const id=String(body.order||'').trim(); if(!id)return json(400,{message:'Informe o número do pedido.'});
  const order=await resolveOrder(id); if(!order)return json(404,{message:'Pedido não encontrado.'});
  const quotes=await melhorEnvioFreightQuote(order);
  return json(200,{ok:true,order:id,quotes});
}

async function setFreight(event){
  let body={};try{body=JSON.parse(event.body||'{}')}catch{}
  if(!adminSecretOk(event,body)) return json(401,{message:'Não autorizado.'});
  const id=String(body.order||'').trim(); if(!id)return json(400,{message:'Informe o número do pedido.'});
  const price=money(body.price); if(price<=0)return json(400,{message:'Informe um valor de frete maior que zero.'});
  const order=await resolveOrder(id); if(!order)return json(404,{message:'Pedido não encontrado.'});
  const provider=String(body.provider||'melhor_envio');
  const label=String(body.label|| (provider==='uber'?'Uber Entregas':'Melhor Envio')).trim();
  const service=String(body.service||'manual').trim();
  const freight={provider,price,label,service,paid:false,createdAt:new Date().toISOString(),quote:body.quote||null};
  const currentRaw={...(order.raw||{})};
  const totals={...(order.totals||{})};
  const subtotal=money(totals.subtotal||totals.total||0);
  const discounts=money(totals.automaticDiscount||0)+money(totals.couponDiscount||0);
  const productTotal=Math.max(0,subtotal-discounts);
  totals.shipping=price; totals.total=money(productTotal+price);
  const delivery={...(order.delivery||{}),shipping:freight};
  currentRaw.delivery=delivery; currentRaw.totals=totals; currentRaw.freight=freight;
  currentRaw.fulfillmentStatus='Aguardando pagamento do frete';
  let paymentUrl=null,checkout=null;
  if(!isProduction()){
    paymentUrl=null;
  }else{
    checkout=await createInfinitePayFreightCheckout({...order,customer:order.raw?.customer||order.customer,delivery,totals},{price});
    paymentUrl=checkout?.url||checkout?.checkout_url||checkout?.payment_url||checkout?.link||checkout?.data?.url||null;
    if(!paymentUrl)throw new Error('A InfinitePay não retornou o link para pagamento do frete.');
  }
  let blingUpdated=null;
  if(order.bling_order_id){
    try{blingUpdated=await updateSaleOrderFreight(order.bling_order_id,{price,total:totals.total,provider,label,service});}catch(e){console.error('[Bling freight update]',e)}
  }
  const updated=await safeUpdateOrder(id,{delivery,totals,payment_url:order.payment_url||null,raw:{...currentRaw,freightPayment:{order_nsu:`${id}-FRETE`,payment_url:paymentUrl,checkout}}});
  return json(200,{ok:true,order:{id,freight,totals,paymentUrl,blingUpdated},paymentUrl});
}

function isPickupMethodServer(method){return method==='pickup'||method==='pickup_uber'}

async function createOrder(body){
  const payment=String(body.payment||'');
  if(!['pix_online','card','cash','pending'].includes(payment)) throw new Error('Forma de pagamento inválida.');
  if(payment==='cash' && body.delivery?.method!=='pickup') throw new Error('Dinheiro está disponível somente para retirada presencial.');
  if(payment==='pending' && body.delivery?.method!=='uber') throw new Error('Pagamento pendente só pode ser usado em Uber Entregas.');
  if(!Array.isArray(body.items)||!body.items.length) throw new Error('Carrinho vazio.');
  const id=orderId();
  if(isProduction() && process.env.BLING_CREATE_ORDERS!=='true') throw new Error('Para produção, ative BLING_CREATE_ORDERS=true para validar estoque/preços no Bling antes de cobrar.');

  let coupon=null;
  if(body.discounts?.couponCode && body.customer?.userId){
    coupon=await getCoupon(String(body.discounts.couponCode).toUpperCase(),String(body.customer.userId));
    if(!coupon) throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  const delivery={...(body.delivery||{})};
  if(delivery.method==='melhor_envio'){
    const sh={...(delivery.shipping||{})};
    const verification=verifyShippingQuoteToken(sh.quote_token,{provider:'melhor_envio',cep:delivery.cep,price:sh.price,service:sh.id||sh.service});
    if(!verification.ok) throw new Error(verification.expired?'A cotação do Melhor Envio expirou. Calcule novamente.':'Cotação do Melhor Envio inválida. Calcule o frete novamente antes de pagar.');
    delivery.shipping={...sh,price:money(verification.price),manual:false,quote_id:verification.quoteId||sh.id};
  } else if(delivery.method==='uber'){
    delivery.shipping={provider:'uber',id:'uber_manual',service:'uber_manual',label:'Uber Entregas — A calcular',price:0,manual:true};
  } else delivery.shipping={...(delivery.shipping||{}),price:0};
  const baseOrder={...body,delivery,id,status:'Aguardando pagamento',paymentStatus:'Aguardando pagamento',createdAt:new Date().toISOString(),fulfillmentStatus:fulfillmentForCreate(delivery.method,payment)};
  if(delivery.method==='pickup') baseOrder.delivery={...delivery,pickupAddress:process.env.STORE_PICKUP_ADDRESS||'C 12, Área Especial 02, Loja 30 — Taguatinga Centro, Brasília - DF — CEP 72010-901'};
  const dbRow={
    id,status:'AWAITING_PAYMENT',payment_status:'AWAITING_PAYMENT',payment_method:payment,
    customer:body.customer||{},delivery:baseOrder.delivery||delivery||{},items:body.items||[],totals:body.totals||{},discounts:body.discounts||{},
    raw:baseOrder
  };
  await safeInsertOrder(dbRow);

  let bling=null;
  if(process.env.BLING_CREATE_ORDERS==='true'){
    try{
      bling=await createSaleOrder({orderId:id,customer:body.customer,delivery:delivery,items:body.items,totals:body.totals,payment,discounts:{...body.discounts,coupon:coupon?.valor||0},relppsMeta:{method:body.delivery?.method||'delivery',payment,fulfillmentStatus:baseOrder.fulfillmentStatus}});
      baseOrder.totals={...(body.totals||{}),...bling.calculated};
      await safeUpdateOrder(id,{bling_order_id:bling.id,totals:baseOrder.totals,raw:{...baseOrder,bling}});
    }catch(e){
      await safeUpdateOrder(id,{status:'ERROR',payment_status:'ERROR',error_message:e.message,raw:{...baseOrder,error:e.message}});
      throw e;
    }
  }

  if(payment==='cash'){
    baseOrder.fulfillmentStatus=body.delivery?.method==='pickup'?'Aguardando pagamento na retirada':'Bloqueado';
    await safeUpdateOrder(id,{raw:baseOrder});
    return {ok:true,order:{...baseOrder,bling,paymentUrl:null},paymentUrl:null};
  }

  if(delivery.method==='uber'){
    await safeUpdateOrder(id,{payment_url:null,raw:{...baseOrder,bling,freightPending:true,fulfillmentStatus:'Aguardando cálculo do frete'}});
    return {ok:true,order:{...baseOrder,bling,paymentUrl:null,freightPending:true},paymentUrl:null,freightPending:true};
  }

  if(!isProduction()){
    return {ok:true,order:{...baseOrder,bling},paymentUrl:null,testMode:true};
  }

  try{
    const checkout=await createInfinitePayCheckout(baseOrder);
    const paymentUrl=checkout?.url || checkout?.checkout_url || checkout?.payment_url || checkout?.link || checkout?.data?.url || null;
    if(!paymentUrl) throw new Error('A InfinitePay não retornou o link de pagamento.');
    await safeUpdateOrder(id,{payment_url:paymentUrl,raw:{...baseOrder,bling,infinitePay:{order_nsu:id,checkout}}});
    return {ok:true,order:{...baseOrder,bling,infinitePay:checkout},paymentUrl};
  }catch(e){
    if(storeConfigured()) await updateOrder(id,{status:'ERROR',payment_status:'ERROR',error_message:e.message,raw:{...baseOrder,bling,error:e.message}});
    throw e;
  }
}


async function handleFreightInfinitePayWebhook(body){
  const orderNsu=String(body?.order_nsu||'');
  if(!/-FRETE$/.test(orderNsu)) return null;
  const originalId=orderNsu.replace(/-FRETE$/,'');
  const order=await resolveOrder(originalId);
  if(!order) return {handled:true,response:json(200,{ok:true,ignored:true})};
  const transactionNsu=body?.transaction_nsu; const slug=body?.invoice_slug||body?.slug;
  if(!transactionNsu||!slug) return {handled:true,response:json(400,{ok:false,message:'transaction_nsu/invoice_slug ausentes para o frete.'})};
  const payment=await checkInfinitePayPayment({orderNsu,transactionNsu,slug});
  const paid=payment?.success===true&&payment?.paid===true;
  const expected=Math.round(money(order.delivery?.shipping?.price||order.raw?.freight?.price||0)*100);
  const paidAmount=Number(payment?.paid_amount??payment?.amount??0);
  if(!paid||paidAmount<expected) return {handled:true,response:json(200,{ok:true,ignored:true,paid:Boolean(paid),amountOk:paidAmount>=expected})};
  const freight={...(order.delivery?.shipping||{}),paid:true,paidAt:new Date().toISOString(),payment:{transaction_nsu:transactionNsu,invoice_slug:slug,paid_amount:paidAmount}};
  const delivery={...(order.delivery||{}),shipping:freight};
  const raw={...(order.raw||{}),delivery,freight,fulfillmentStatus:'Liberado para entrega',freightPayment:{...(order.raw?.freightPayment||{}),paid:true,transaction_nsu:transactionNsu,invoice_slug:slug}};
  if(order.bling_order_id){try{await updateSaleOrderFreight(order.bling_order_id,{price:money(freight.price),total:money(order.totals?.total||0),provider:freight.provider,label:freight.label,service:freight.service,paid:true});}catch(e){console.error('[Bling freight paid]',e)}}
  const updated=await safeUpdateOrder(originalId,{delivery,status:'PAID',payment_status:'APPROVED',paid_at:new Date().toISOString(),raw});
  return {handled:true,response:json(200,{ok:true,status:'PAID',order:updated})};
}

async function handleInfinitePayWebhook(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{}
  const freightResult=await handleFreightInfinitePayWebhook(body);
  if(freightResult?.handled) return freightResult.response;
  const orderNsu=body?.order_nsu;
  if(!orderNsu) return json(400,{ok:false,message:'order_nsu ausente.'});
  const order=await resolveOrder(String(orderNsu));
  if(!order) return json(200,{ok:true,ignored:true});
  if(order.status==='PAID' || order.payment_status==='APPROVED') return json(200,{ok:true,status:'PAID',alreadyProcessed:true});

  // O webhook é recebido apenas como sinal. Validamos o pagamento consultando
  // diretamente a API oficial da InfinitePay antes de marcar o pedido como pago.
  const transactionNsu=body?.transaction_nsu;
  const slug=body?.invoice_slug || body?.slug;
  if(!transactionNsu || !slug) return json(400,{ok:false,message:'transaction_nsu/invoice_slug ausentes.'});

  const payment=await checkInfinitePayPayment({orderNsu,transactionNsu,slug});
  const paid=payment?.success===true && payment?.paid===true;
  const expected=Math.round(money(order.totals?.total||0)*100);
  const paidAmount=Number(payment?.paid_amount ?? payment?.amount ?? 0);
  const amountOk=paidAmount>=expected;
  if(!paid || !amountOk){
    return json(200,{ok:true,ignored:true,paid:Boolean(paid),amountOk,order:String(orderNsu)});
  }

  let blingUpdated=null;
  if(order.bling_order_id){
    const paidSituation=situationId('paid');
    if(paidSituation){try{blingUpdated=await setOrderSituation(order.bling_order_id,paidSituation)}catch(e){console.error('[Bling payment update]',e)}}
    await markBlingPaymentApproved(order.bling_order_id,{...payment,transaction_nsu:transactionNsu,slug});
  }

  const updated=await safeUpdateOrder(order.id,{
    status:'PAID',payment_status:'APPROVED',paid_at:new Date().toISOString(),
    raw:{...(order.raw||{}),fulfillmentStatus:order.delivery?.method==='pickup_uber'?'Aguardando liberação da loja':(order.delivery?.method==='pickup'?'Liberado para retirada':'Liberado para entrega'),payment:{provider:'InfinitePay',transaction_nsu:transactionNsu,invoice_slug:slug,capture_method:payment.capture_method,amount:payment.amount,paid_amount:payment.paid_amount,installments:payment.installments,receipt_url:body?.receipt_url||null}}
  });
  if(order.raw?.customer?.userId && order.raw?.discounts?.couponCode){
    try{await markCouponUsed(order.raw.discounts.couponCode,order.raw.customer.userId)}catch(e){console.error('[Coupon]',e)}
  }
  return json(200,{ok:true,status:'PAID',blingUpdated,order:updated});
}

async function checkInfinitePayReturn(event){
  const id=event.queryStringParameters?.order;
  const transactionNsu=event.queryStringParameters?.transaction_nsu;
  const slug=event.queryStringParameters?.slug;
  if(!id || !transactionNsu || !slug) return json(200,{ok:true,checked:false});
  const order=await resolveOrder(id);
  if(!order) return json(404,{message:'Pedido não encontrado.'});
  const payment=await checkInfinitePayPayment({orderNsu:id,transactionNsu,slug});
  if(payment?.success===true && payment?.paid===true){
    const expected=Math.round(money(order.totals?.total||0)*100);
    const paidAmount=Number(payment?.paid_amount ?? payment?.amount ?? 0);
    if(paidAmount>=expected && order.status!=='PAID'){
      if(order.bling_order_id){
        const paidSituation=situationId('paid');
        if(paidSituation){try{await setOrderSituation(order.bling_order_id,paidSituation)}catch(e){console.error('[Bling return update]',e)}}
        await markBlingPaymentApproved(order.bling_order_id,{...payment,transaction_nsu:transactionNsu,slug});
      }
      await safeUpdateOrder(id,{status:'PAID',payment_status:'APPROVED',paid_at:new Date().toISOString(),raw:{...(order.raw||{}),fulfillmentStatus:order.delivery?.method==='pickup_uber'?'Aguardando liberação da loja':(order.delivery?.method==='pickup'?'Liberado para retirada':'Liberado para entrega'),payment:{provider:'InfinitePay',transaction_nsu:transactionNsu,invoice_slug:slug,capture_method:payment.capture_method,receipt_url:null}}});
    }
  }
  return json(200,{ok:true,paid:Boolean(payment?.paid),payment});
}


async function getPublicOrder(id){
  const order=await resolveOrder(id);
  if(!order) return json(404,{message:'Pedido não encontrado.'});
  const paid=order.payment_status==='APPROVED' || order.status==='PAID';
  return json(200,{ok:true,order:{id:order.id,status:paid?'PAID':order.status||'AWAITING_PAYMENT',paymentStatus:paid?'APPROVED':(order.payment_status||'AWAITING_PAYMENT'),paymentMethod:order.payment_method||order.raw?.payment||null,paymentUrl:order.payment_url||null,blingOrderId:order.bling_order_id,createdAt:order.created_at||null,paidAt:order.paid_at||null,delivery:order.delivery||{},totals:order.totals||{},items:order.items||order.raw?.items||[],fulfillmentStatus:order.raw?.fulfillmentStatus||null,freight:order.delivery?.shipping||order.raw?.freight||null,freightPayment:order.raw?.freightPayment||null,uber:order.raw?.uber||null}});
}


async function releaseOrder(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{}
  if(!adminSecretOk(event,body)) return json(401,{message:'Não autorizado.'});
  const id=String(body.order||'').trim(); if(!id) return json(400,{message:'Informe o número do pedido.'});
  const order=await resolveOrder(id); if(!order) return json(404,{message:'Pedido não encontrado.'});
  if(order.payment_status!=='APPROVED') return json(409,{message:'O pedido ainda não tem pagamento aprovado.'});
  const raw={...(order.raw||{}),fulfillmentStatus:'Liberado para Uber',releasedAt:new Date().toISOString()};
  const updated=await safeUpdateOrder(id,{raw});
  return json(200,{ok:true,order:{id:updated.id,status:updated.status,paymentStatus:updated.payment_status,fulfillmentStatus:raw.fulfillmentStatus,delivery:updated.delivery}});
}
async function requestUber(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{}
  const id=String(body.order||'').trim(); if(!id) return json(400,{message:'Informe o número do pedido.'});
  const order=await resolveOrder(id); if(!order) return json(404,{message:'Pedido não encontrado.'});
  const fulfillment=String(order.raw?.fulfillmentStatus||'');
  if(order.payment_status!=='APPROVED') return json(409,{message:'O pagamento ainda não foi aprovado.'});
  if(order.delivery?.method!=='pickup_uber') return json(409,{message:'Este pedido não é uma retirada via Uber.'});
  if(fulfillment!=='Liberado para Uber') return json(409,{message:'A loja ainda não liberou o pedido para o Uber.'});
  if(order.raw?.uber?.delivery_id) return json(200,{ok:true,uber:order.raw.uber});
  let quoteId=order.delivery?.shipping?.id || order.delivery?.shipping?.quote_id || order.raw?.uber?.quote_id;
  if(!quoteId){
    const q=await quoteUberDelivery({delivery:order.delivery||{},subtotal:Number(order.totals?.subtotal||order.totals?.total||0)});
    quoteId=q?.id||null;
  }
  if(!quoteId) return json(409,{message:'Não foi possível obter uma nova cotação do Uber Direct. Confira se o Uber Direct está habilitado no Netlify.'});
  const delivery=await createUberDelivery({order,quoteId});
  const uber={quote_id:quoteId,delivery_id:delivery?.id||null,tracking_url:delivery?.tracking_url||delivery?.trackingUrl||null,status:delivery?.status||'created',raw:delivery,created_at:new Date().toISOString()};
  const raw={...(order.raw||{}),fulfillmentStatus:'Uber solicitado',uber};
  await safeUpdateOrder(id,{raw});
  return json(200,{ok:true,uber});
}

exports.handler=async(event)=>{
  try{
    const action=event.queryStringParameters?.action||'create';
    if(action==='infinitepay-webhook') return await handleInfinitePayWebhook(event);
    if(action==='release') return await releaseOrder(event);
    if(action==='request-uber') return await requestUber(event);
    if(action==='calculate-freight') return await calculateFreight(event);
    if(action==='set-freight') return await setFreight(event);
    if(action==='sync-uber-freight') return await syncUberFreightFromBling(event);
    if(action==='infinitepay-return') return await checkInfinitePayReturn(event);
    if(event.httpMethod==='GET' && action==='status') return await getPublicOrder(event.queryStringParameters?.order);
    if(event.httpMethod!=='POST') return json(405,{message:'Método não permitido'});
    if(action==='create') return json(201,await createOrder(JSON.parse(event.body||'{}')));
    return json(404,{message:'Ação não encontrada.'});
  }catch(e){
    console.error('[Checkout]',e);
    return json(500,{message:e.message||'Erro no checkout.'});
  }
};
