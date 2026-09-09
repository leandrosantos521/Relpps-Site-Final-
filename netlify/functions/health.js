function json(statusCode, body){
  return {statusCode,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},body:JSON.stringify(body)};
}

exports.handler=async()=>{
  const checks={
    bling:Boolean(process.env.BLING_CLIENT_ID&&process.env.BLING_CLIENT_SECRET&&process.env.BLING_REFRESH_TOKEN),
    blingOrders:process.env.BLING_CREATE_ORDERS==='true',
    blingPendingSituation:Boolean(process.env.BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID),
    blingPaidSituation:Boolean(process.env.BLING_SITUACAO_PAGO_ID),
    infinitePay:Boolean(String(process.env.INFINITEPAY_HANDLE||'').trim()),
    supabase:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),
    shipping:Boolean(process.env.MELHOR_ENVIO_TOKEN&&String(process.env.STORE_POSTAL_CODE||'').replace(/\D/g,'').length===8),
    production:process.env.CHECKOUT_TEST_MODE==='false',
    publicSite:Boolean(process.env.PUBLIC_SITE_URL)
  };
  const ok=checks.bling&&checks.blingOrders&&checks.blingPendingSituation&&checks.blingPaidSituation&&checks.infinitePay&&checks.supabase&&checks.production&&checks.publicSite;
  return json(ok?200:503,{ok,service:'Relpps production preflight',checks,warning:checks.shipping?'':'Frete Melhor Envio ainda não configurado; retirada presencial continua disponível.'});
};
