let tokenCache={token:null,expiresAt:0};
function env(name,...aliases){for(const k of [name,...aliases]){const v=String(process.env[k]||'').trim();if(v)return v}return ''}
function enabled(){return env('UBER_DIRECT_ENABLED')==='true' || Boolean(env('UBER_DIRECT_CLIENT_ID','UBER_CLIENT_ID')&&env('UBER_DIRECT_CLIENT_SECRET','UBER_CLIENT_SECRET')&&env('UBER_DIRECT_CUSTOMER_ID','UBER_STORE_ID'))}
function parseAddress({address='',number='',complement='',district='',city='',cep='',uf=''}){
  const c=String(city||'').split('/').map(x=>x.trim());
  return JSON.stringify({street_address:[`${String(address||'').trim()}${number?`, ${String(number).trim()}`:''}${complement?` - ${String(complement).trim()}`:''}`],city:c[0]||String(city||'').trim(),state:c[1]||String(uf||'').trim(),zip_code:String(cep||'').replace(/\D/g,''),country:'BR'});
}
async function getAccessToken(){
  if(!enabled()) return null;
  if(tokenCache.token && Date.now()<tokenCache.expiresAt-60000) return tokenCache.token;
  const clientId=env('UBER_DIRECT_CLIENT_ID','UBER_CLIENT_ID'); const clientSecret=env('UBER_DIRECT_CLIENT_SECRET','UBER_CLIENT_SECRET');
  const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'client_credentials',scope:'eats.deliveries direct.organizations'});
  const r=await fetch('https://auth.uber.com/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data?.error_description||data?.error||`Uber OAuth HTTP ${r.status}`);
  tokenCache={token:data.access_token,expiresAt:Date.now()+Number(data.expires_in||2592000)*1000}; return tokenCache.token;
}
async function uberFetch(path,options={}){
  const token=await getAccessToken(); if(!token) return null;
  const r=await fetch(`https://api.uber.com${path}`,{...options,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`,...(options.headers||{})}});
  const text=await r.text(); let data={}; try{data=JSON.parse(text)}catch{} if(!r.ok) throw new Error(data?.message||data?.error||`Uber Direct HTTP ${r.status}`); return data;
}
function pickupAddress(){
  return parseAddress({address:env('STORE_PICKUP_STREET','STORE_ADDRESS')||'C 12, Área Especial 02',number:env('STORE_PICKUP_NUMBER')||'Loja 30',district:env('STORE_PICKUP_DISTRICT')||'Taguatinga Centro',city:env('STORE_PICKUP_CITY')||'Brasília / DF',cep:env('STORE_POSTAL_CODE')||'72010901'});
}
function pickupPhone(){return env('STORE_PICKUP_PHONE','STORE_PHONE')||'+5561996498557'}
async function quote({delivery,subtotal=0}){
  const customerId=env('UBER_DIRECT_CUSTOMER_ID','UBER_STORE_ID'); if(!customerId||!enabled()) return null;
  const dropoff=parseAddress(delivery); const payload={pickup_address:pickupAddress(),dropoff_address:dropoff,manifest_total_value:Math.round(Number(subtotal||0)*100),external_store_id:'relpps'};
  const data=await uberFetch(`/v1/customers/${encodeURIComponent(customerId)}/delivery_quotes`,{method:'POST',body:JSON.stringify(payload)});
  if(!data) return null; return {id:data.id,name:'Uber Direct',company:'Uber',price:Number(data.fee||0)/100,eta:data.dropoff_eta||null,duration:data.duration||null,expires:data.expires||null,raw:data};
}
async function createDelivery({order,quoteId}){
  const customerId=env('UBER_DIRECT_CUSTOMER_ID','UBER_STORE_ID'); if(!customerId||!enabled()) throw new Error('Uber Direct ainda não configurado/aprovado. Defina as credenciais no Netlify.');
  if(!quoteId) throw new Error('Cotação Uber não encontrada ou expirada.');
  const d=order.delivery||{}, c=order.customer||{};
  const manifest=(order.items||[]).map(i=>({name:String(i.name||'Produto').slice(0,80),quantity:Number(i.quantity)||1,size:'small',price:Math.round(Number(i.unitPrice||0)*100)}));
  const payload={quote_id:quoteId,pickup_address:pickupAddress(),pickup_name:'Relpps Cosméticos',pickup_phone_number:pickupPhone(),dropoff_address:parseAddress(d),dropoff_name:String(c.name||'Cliente'),dropoff_phone_number:`+${String(c.phone||'').replace(/\D/g,'')}`,manifest_items:manifest,external_id:String(order.id)};
  const data=await uberFetch(`/v1/customers/${encodeURIComponent(customerId)}/deliveries`,{method:'POST',body:JSON.stringify(payload)});
  return data;
}
module.exports={enabled,getAccessToken,quote,createDelivery,pickupAddress,pickupPhone};
