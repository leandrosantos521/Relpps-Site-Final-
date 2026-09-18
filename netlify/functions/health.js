const {getBlingOAuth}=require('./_lib/bling-oauth-store');
function json(statusCode, body){
  return {statusCode,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},body:JSON.stringify(body)};
}

async function supabaseTableExists(table){
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!key)return false;
  try{
    const r=await fetch(`${url}/rest/v1/${table}?select=*&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'}});
    return r.ok;
  }catch{return false;}
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
    publicSite:Boolean(process.env.PUBLIC_SITE_URL),
    relppsOrders:false,
    relppsBlingOAuth:false,
    relppsMelhorEnvioOAuth:false
  };
  if(checks.supabase){
    [checks.relppsOrders,checks.relppsBlingOAuth,checks.relppsMelhorEnvioOAuth]=await Promise.all([supabaseTableExists('relpps_orders'),supabaseTableExists('relpps_bling_oauth'),supabaseTableExists('relpps_melhor_envio_oauth')]);
  }
  const ok=checks.bling&&checks.blingOrders&&checks.infinitePay&&checks.production&&checks.publicSite;
  const warnings=[];
  if(!checks.relppsOrders)warnings.push('Supabase: crie a tabela relpps_orders pelo SQL entregue no ZIP.');
  if(!checks.relppsBlingOAuth)warnings.push('Supabase: crie relpps_bling_oauth para manter o OAuth do Bling renovável.');
  if(!checks.shipping)warnings.push('Melhor Envio ainda não está conectado; Uber manual e retirada continuam disponíveis.');
  if(!checks.blingPendingSituation||!checks.blingPaidSituation)warnings.push('Opcional: informe os IDs das situações Aguardando Pagamento e Pago do Bling para atualizar a situação automaticamente.');
  return json(ok?200:503,{ok,service:'Relpps production preflight',checks,warnings,note:'Nenhuma chave secreta é retornada por este endpoint.'});
};
