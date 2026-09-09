function config(){
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  if(!url||!key) throw new Error('Supabase do backend não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  return {url,key};
}
async function supabase(path,options={}){
  const {url,key}=config();
  const headers={apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json','Content-Type':'application/json',...(options.headers||{})};
  const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers});
  const text=await r.text();
  let data=null; try{data=JSON.parse(text)}catch{}
  if(!r.ok) throw new Error(data?.message||data?.hint||text||`Supabase HTTP ${r.status}`);
  return data;
}
async function getOrder(id){
  const rows=await supabase(`relpps_orders?id=eq.${encodeURIComponent(id)}&select=*`);
  return rows?.[0]||null;
}
async function insertOrder(row){
  const data=await supabase('relpps_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
  return data?.[0]||data;
}
async function updateOrder(id,patch){
  const data=await supabase(`relpps_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
  return data?.[0]||data;
}
async function getCoupon(code,userId){
  if(!code||!userId) return null;
  const rows=await supabase(`clube_relpps_cupons?codigo=eq.${encodeURIComponent(code)}&user_id=eq.${encodeURIComponent(userId)}&usado=eq.false&select=*`);
  return rows?.[0]||null;
}
async function markCouponUsed(code,userId){
  if(!code||!userId)return;
  await supabase(`clube_relpps_cupons?codigo=eq.${encodeURIComponent(code)}&user_id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({usado:true,used_at:new Date().toISOString()})});
}
module.exports={supabase,getOrder,insertOrder,updateOrder,getCoupon,markCouponUsed};
