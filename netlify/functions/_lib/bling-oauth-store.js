const TABLE = 'relpps_bling_oauth';
function config(){return {url:String(process.env.SUPABASE_URL||'').replace(/\/$/,''),key:process.env.SUPABASE_SERVICE_ROLE_KEY||''};}
async function request(path, options={}){
  const {url,key}=config(); if(!url||!key) return null;
  const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation',...(options.headers||{})}});
  const text=await r.text(); let data=null; try{data=JSON.parse(text)}catch{}
  if(!r.ok) throw new Error(data?.message||data?.error_description||text||`Supabase HTTP ${r.status}`); return data;
}
async function getBlingOAuth(){const rows=await request(`${TABLE}?id=eq.1&select=*`);return Array.isArray(rows)&&rows[0]?rows[0]:null;}
async function saveBlingOAuth(data){return request(TABLE,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:1,access_token:data.access_token||null,refresh_token:data.refresh_token||null,token_type:data.token_type||'Bearer',expires_in:Number(data.expires_in)||null,expires_at:data.expires_at||null,updated_at:new Date().toISOString()})});}
async function clearBlingOAuth(){return request(`${TABLE}?id=eq.1`,{method:'DELETE'});}
module.exports={getBlingOAuth,saveBlingOAuth,clearBlingOAuth};
