const {createSaleOrder,setOrderSituation,situationId}=require('./_lib/bling-client');
const {getOrder,insertOrder,updateOrder,getCoupon,markCouponUsed}=require('./_lib/store');
const {createDelivery: createUberDelivery,quote: quoteUberDelivery}=require('./_lib/uber-direct');

function json(statusCode,body,headers={}){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers},body:JSON.stringify(body)}}
function orderId(){return `REL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`}
function isProduction(){return process.env.CHECKOUT_TEST_MODE==='false'}
function publicBaseUrl(){return String(process.env.PUBLIC_SITE_URL||'https://relppscosmeticos.netlify.app').replace(/\/$/,'')}
function storeConfigured(){return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)}
function money(v){return Number(Number(v||0).toFixed(2));}
function adminSecretOk(event,body={}){const expected=String(process.env.RELPPS_ADMIN_RELEASE_SECRET||'').trim(); const supplied=String(body.secret||event.headers?.['x-relpps-admin-secret']||event.headers?.['X-Relpps-Admin-Secret']||'').trim(); return Boolean(expected && supplied && supplied===expected);}
function fulfillmentForCreate(method,payment){ if(method==='pickup_uber') return payment==='cash'?'Aguardando pagamento na retirada':'Aguardando pagamento'; if(method==='pickup') return payment==='cash'?'Aguardando pagamento na retirada':'Aguardando pagamento'; return 'Aguardando pagamento'; }

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

function infinitePayConfigured(){
  return Boolean(String(process.env.INFINITEPAY_HANDLE||'').trim());
}

async function createInfinitePayCheckout(order){
  const handle=String(process.env.INFINITEPAY_HANDLE||'').replace(/^\$/,'').trim();
  if(!handle) throw new Error('InfinitePay não configurado. Defina INFINITEPAY_HANDLE no Netlify.');

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
    redirect_url:`${publicBaseUrl()}/?checkout=infinitepay-return&order=${encodeURIComponent(order.id)}`,
    webhook_url:`${publicBaseUrl()}/.netlify/functions/checkout?action=infinitepay-webhook`,
    customer:{
      name:String(order.customer?.name||'').trim(),
      email:String(order.customer?.email||'').trim(),
      phone_number:String(order.customer?.phone||'').replace(/\D/g,'')
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

async function checkInfinitePayPayment({orderNsu,transactionNsu,slug}){
  const handle=String(process.env.INFINITEPAY_HANDLE||'').replace(/^\$/,'').trim();
  if(!handle) throw new Error('InfinitePay não configurado.');
  if(!orderNsu || !transactionNsu || !slug) throw new Error('Dados insuficientes para consultar o pagamento InfinitePay.');
  return infinitePay('/payment_check',{method:'POST',body:JSON.stringify({
    handle,order_nsu:String(orderNsu),transaction_nsu:String(transactionNsu),slug:String(slug)
  })});
}


async function createOrder(body){
  const payment=String(body.payment||'');
  if(!['pix_online','card','cash'].includes(payment)) throw new Error('Forma de pagamento inválida.');
  if(payment==='cash' && body.delivery?.method!=='pickup') throw new Error('Dinheiro está disponível somente para retirada presencial.');
  if(!Array.isArray(body.items)||!body.items.length) throw new Error('Carrinho vazio.');
  const id=orderId();
  if(isProduction() && process.env.BLING_CREATE_ORDERS!=='true') throw new Error('Para produção, ative BLING_CREATE_ORDERS=true para validar estoque/preços no Bling antes de cobrar.');

  let coupon=null;
  if(body.discounts?.couponCode && body.customer?.userId){
    coupon=await getCoupon(String(body.discounts.couponCode).toUpperCase(),String(body.customer.userId));
    if(!coupon) throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  const baseOrder={...body,id,status:'Aguardando pagamento',paymentStatus:'Aguardando pagamento',createdAt:new Date().toISOString(),fulfillmentStatus:fulfillmentForCreate(body.delivery?.method,payment)};
  if(body.delivery?.method==='pickup') baseOrder.delivery={...(body.delivery||{}),pickupAddress:process.env.STORE_PICKUP_ADDRESS||'C 12, Área Especial 02, Loja 30 — Taguatinga Centro, Brasília - DF — CEP 72010-901'};
  const dbRow={
    id,status:'AWAITING_PAYMENT',payment_status:'AWAITING_PAYMENT',payment_method:payment,
    customer:body.customer||{},delivery:baseOrder.delivery||{},items:body.items||[],totals:body.totals||{},discounts:body.discounts||{},
    raw:baseOrder
  };
  if(storeConfigured()) await insertOrder(dbRow);

  let bling=null;
  if(process.env.BLING_CREATE_ORDERS==='true'){
    try{
      bling=await createSaleOrder({orderId:id,customer:body.customer,delivery:body.delivery,items:body.items,totals:body.totals,payment,discounts:{...body.discounts,coupon:coupon?.valor||0}});
      baseOrder.totals={...(body.totals||{}),...bling.calculated};
      if(storeConfigured()) await updateOrder(id,{bling_order_id:bling.id,totals:baseOrder.totals,raw:{...baseOrder,bling}});
    }catch(e){
      if(storeConfigured()) await updateOrder(id,{status:'ERROR',payment_status:'ERROR',error_message:e.message,raw:{...baseOrder,error:e.message}});
      throw e;
    }
  }

  if(payment==='cash'){
    baseOrder.fulfillmentStatus=body.delivery?.method==='pickup'?'Aguardando pagamento na retirada':'Bloqueado';
    if(storeConfigured()) await updateOrder(id,{raw:baseOrder});
    return {ok:true,order:{...baseOrder,bling,paymentUrl:null},paymentUrl:null};
  }

  if(!isProduction()){
    return {ok:true,order:{...baseOrder,bling},paymentUrl:null,testMode:true};
  }

  try{
    const checkout=await createInfinitePayCheckout(baseOrder);
    const paymentUrl=checkout?.url || checkout?.checkout_url || checkout?.payment_url || checkout?.link || checkout?.data?.url || null;
    if(!paymentUrl) throw new Error('A InfinitePay não retornou o link de pagamento.');
    if(storeConfigured()) await updateOrder(id,{payment_url:paymentUrl,raw:{...baseOrder,bling,infinitePay:{order_nsu:id,checkout}}});
    return {ok:true,order:{...baseOrder,bling,infinitePay:checkout},paymentUrl};
  }catch(e){
    if(storeConfigured()) await updateOrder(id,{status:'ERROR',payment_status:'ERROR',error_message:e.message,raw:{...baseOrder,bling,error:e.message}});
    throw e;
  }
}

async function handleInfinitePayWebhook(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{}
  const orderNsu=body?.order_nsu;
  if(!orderNsu) return json(400,{ok:false,message:'order_nsu ausente.'});
  const order=await getOrder(String(orderNsu));
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
    if(paidSituation){
      try{blingUpdated=await setOrderSituation(order.bling_order_id,paidSituation)}catch(e){console.error('[Bling payment update]',e)}
    }
  }

  const updated=await updateOrder(order.id,{
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
  const order=await getOrder(id);
  if(!order) return json(404,{message:'Pedido não encontrado.'});
  const payment=await checkInfinitePayPayment({orderNsu:id,transactionNsu,slug});
  if(payment?.success===true && payment?.paid===true){
    const expected=Math.round(money(order.totals?.total||0)*100);
    const paidAmount=Number(payment?.paid_amount ?? payment?.amount ?? 0);
    if(paidAmount>=expected && order.status!=='PAID'){
      if(order.bling_order_id){
        const paidSituation=situationId('paid');
        if(paidSituation){try{await setOrderSituation(order.bling_order_id,paidSituation)}catch(e){console.error('[Bling return update]',e)}}
      }
      await updateOrder(id,{status:'PAID',payment_status:'APPROVED',paid_at:new Date().toISOString(),raw:{...(order.raw||{}),payment:{provider:'InfinitePay',transaction_nsu:transactionNsu,invoice_slug:slug,capture_method:payment.capture_method,receipt_url:null}}});
    }
  }
  return json(200,{ok:true,paid:Boolean(payment?.paid),payment});
}


async function getPublicOrder(id){
  const order=await getOrder(id);
  if(!order) return json(404,{message:'Pedido não encontrado.'});
  return json(200,{ok:true,order:{id:order.id,status:order.status,paymentStatus:order.payment_status,paymentUrl:order.payment_url,blingOrderId:order.bling_order_id,createdAt:order.created_at,paidAt:order.paid_at,delivery:order.delivery,totals:order.totals,fulfillmentStatus:order.raw?.fulfillmentStatus||null,uber:order.raw?.uber||null}});
}


async function releaseOrder(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{}
  if(!adminSecretOk(event,body)) return json(401,{message:'Não autorizado.'});
  const id=String(body.order||'').trim(); if(!id) return json(400,{message:'Informe o número do pedido.'});
  const order=await getOrder(id); if(!order) return json(404,{message:'Pedido não encontrado.'});
  if(order.payment_status!=='APPROVED') return json(409,{message:'O pedido ainda não tem pagamento aprovado.'});
  const raw={...(order.raw||{}),fulfillmentStatus:'Liberado para Uber',releasedAt:new Date().toISOString()};
  const updated=await updateOrder(id,{raw});
  return json(200,{ok:true,order:{id:updated.id,status:updated.status,paymentStatus:updated.payment_status,fulfillmentStatus:raw.fulfillmentStatus,delivery:updated.delivery}});
}
async function requestUber(event){
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{}
  const id=String(body.order||'').trim(); if(!id) return json(400,{message:'Informe o número do pedido.'});
  const order=await getOrder(id); if(!order) return json(404,{message:'Pedido não encontrado.'});
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
  await updateOrder(id,{raw});
  return json(200,{ok:true,uber});
}

exports.handler=async(event)=>{
  try{
    const action=event.queryStringParameters?.action||'create';
    if(action==='infinitepay-webhook') return await handleInfinitePayWebhook(event);
    if(action==='release') return await releaseOrder(event);
    if(action==='request-uber') return await requestUber(event);
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
