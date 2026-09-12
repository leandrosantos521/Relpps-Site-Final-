const {getBlingOAuth}=require('./_lib/bling-oauth-store');
function json(statusCode, body){
  return {statusCode,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},body:JSON.stringify(body)};
}

exports.handler=async()=>{
  let oauth=null;
  try{oauth=await getBlingOAuth();}catch{}
  const blingCredentials=Boolean(process.env.BLING_CLIENT_ID&&process.env.BLING_CLIENT_SECRET);
  const blingToken=Boolean(process.env.BLING_ACCESS_TOKEN||process.env.BLING_REFRESH_TOKEN||oauth?.access_token||oauth?.refresh_token);
  const checks={
    bling:Boolean(blingCredentials&&blingToken),
    blingOrders:process.env.BLING_CREATE_ORDERS==='true',
    blingPendingSituation:Boolean(process.env.BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID),
    blingPaidSituation:Boolean(process.env.BLING_SITUACAO_PAGO_ID),
    infinitePay:Boolean(String(process.env.INFINITEPAY_HANDLE||'rps210323').trim()),
    supabase:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),
    shipping:Boolean(process.env.MELHOR_ENVIO_TOKEN&&String(process.env.STORE_POSTAL_CODE||'').replace(/\D/g,'').length===8),
    production:process.env.CHECKOUT_TEST_MODE==='false',
    publicSite:Boolean(process.env.PUBLIC_SITE_URL)
  };
  // relpps_orders is optional for the checkout fallback; it is still recommended for history/coupons.
  const ok=checks.bling&&checks.blingOrders&&checks.infinitePay&&checks.production&&checks.publicSite;
  return json(ok?200:503,{ok,service:'Relpps production preflight',checks,warning:checks.shipping?'':'Frete Melhor Envio ainda não configurado; retirada presencial continua disponível.',note:'A tabela relpps_orders do Supabase é recomendada, mas não bloqueia o checkout InfinitePay.'});
};
