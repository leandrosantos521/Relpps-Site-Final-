const BLING_BASE = "https://api.bling.com.br/Api/v3";
const crypto = require("crypto");
const { getBlingOAuth, saveBlingOAuth, clearBlingOAuth } = require("./_lib/bling-oauth-store");

function json(statusCode, body, headers={}) {
  return {
    statusCode,
    headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers},
    body: JSON.stringify(body)
  };
}

function publicSiteUrl(){ return String(process.env.PUBLIC_SITE_URL || "https://relppscosmeticos.netlify.app").replace(/\/$/,""); }
function redirectUri(){ return process.env.BLING_REDIRECT_URI || `${publicSiteUrl()}/bling-callback.html`; }
function oauthSecret(){ return process.env.BLING_OAUTH_STATE_SECRET || process.env.BLING_CLIENT_SECRET || ""; }
function signState(payload){
  const raw=Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig=crypto.createHmac("sha256",oauthSecret()).update(raw).digest("base64url");
  return `${raw}.${sig}`;
}
function verifyState(state){
  const [raw,sig]=String(state||"").split(".");
  const secret=oauthSecret(); if(!raw||!sig||!secret) return null;
  const expected=crypto.createHmac("sha256",secret).update(raw).digest("base64url");
  if(sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null;
  try { const data=JSON.parse(Buffer.from(raw,"base64url").toString("utf8")); return Date.now()-Number(data.created_at||0)<=10*60*1000 ? data : null; } catch { return null; }
}
async function refreshAccessToken(refresh){
  const clientId=process.env.BLING_CLIENT_ID, clientSecret=process.env.BLING_CLIENT_SECRET;
  if(!refresh||!clientId||!clientSecret) throw new Error("BLING_CLIENT_ID/BLING_CLIENT_SECRET/BLING_REFRESH_TOKEN não configurados.");
  const basic=Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body=new URLSearchParams({grant_type:"refresh_token",refresh_token:refresh});
  const r=await fetch(`${BLING_BASE}/oauth/token`,{method:"POST",headers:{Authorization:`Basic ${basic}`,"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json","enable-jwt":"1"},body});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.description||data?.message||`Bling OAuth HTTP ${r.status}`);
  data.saved_at=new Date().toISOString(); if(data.expires_in) data.expires_at=new Date(Date.now()+Number(data.expires_in)*1000).toISOString();
  try { await saveBlingOAuth(data); } catch(e) { console.warn("Falha ao salvar token Bling no Supabase:",e.message); }
  return data.access_token;
}
async function tokenFromRefresh(){
  const access=process.env.BLING_ACCESS_TOKEN; if(access) return access;
  let stored=null; try { stored=await getBlingOAuth(); } catch(e) { console.warn("Falha ao ler token Bling do Supabase:",e.message); }
  if(stored?.access_token && stored?.expires_at && Date.now()<new Date(stored.expires_at).getTime()-60000) return stored.access_token;
  return refreshAccessToken(stored?.refresh_token || process.env.BLING_REFRESH_TOKEN);
}
async function exchangeAuthorizationCode(code){
  const clientId=process.env.BLING_CLIENT_ID, clientSecret=process.env.BLING_CLIENT_SECRET;
  if(!clientId||!clientSecret) throw new Error("BLING_CLIENT_ID/BLING_CLIENT_SECRET não configurados.");
  const basic=Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body=new URLSearchParams({grant_type:"authorization_code",code});
  const r=await fetch(`${BLING_BASE}/oauth/token`,{method:"POST",headers:{Authorization:`Basic ${basic}`,"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json","enable-jwt":"1"},body});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.description||data?.message||`Bling OAuth HTTP ${r.status}`);
  data.saved_at=new Date().toISOString(); if(data.expires_in) data.expires_at=new Date(Date.now()+Number(data.expires_in)*1000).toISOString();
  await saveBlingOAuth(data); return data;
}

async function blingFetch(path, options={}) {
  const token = await tokenFromRefresh();
  const headers = {"Authorization":`Bearer ${token}`,"Accept":"application/json","Content-Type":"application/json","enable-jwt":"1",...(options.headers||{})};
  const r = await fetch(`${BLING_BASE}${path}`,{...options,headers});
  const text = await r.text();
  let data={}; try{data=JSON.parse(text)}catch{}
  if(!r.ok) throw new Error(data?.error?.description || data?.message || `Bling HTTP ${r.status}`);
  return data;
}


let blingImageLastStart=0;
const blingImageMemoryCache=new Map();
async function waitBlingImageSlot(){ const gap=220; const now=Date.now(); const wait=Math.max(0,gap-(now-blingImageLastStart)); if(wait) await new Promise(r=>setTimeout(r,wait)); blingImageLastStart=Date.now(); }
async function mapLimit(items, limit, worker){
  const out=new Array(items.length); let next=0;
  async function run(){
    while(true){ const i=next++; if(i>=items.length) return; try{ out[i]=await worker(items[i],i); }catch(e){ out[i]=null; } }
  }
  await Promise.all(Array.from({length:Math.max(1,Math.min(limit,items.length||1))},run));
  return out;
}
function collectImageValues(value,out=[],seen=new Set(),key=""){
  if(!value) return out;
  const imageKey=/(imagem|imagens|imagemurl|urlimagem|imagemprincipal|foto|fotos|image|images|url|link|href|src|arquivo|anexo|media|midia)/i;
  const looksImage=x=>/\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(x)||/bling\.com\.br|cdn|image|imagem|foto/i.test(x);
  if(typeof value==="string"){ const x=value.trim(); if(/^https?:\/\//i.test(x)&&(imageKey.test(String(key))||looksImage(x))&&!seen.has(x)){seen.add(x);out.push(x)} return out; }
  if(Array.isArray(value)){value.forEach(v=>collectImageValues(v,out,seen,key));return out;}
  if(typeof value==="object") for(const [k,v] of Object.entries(value)){if(imageKey.test(k)||typeof v==="object") collectImageValues(v,out,seen,k);}
  return out;
}
async function getProductImageMap(ids){
  const unique=[...new Set(ids.map(String).filter(Boolean))].slice(0,24);
  const now=Date.now();
  const missing=unique.filter(id=>{const hit=blingImageMemoryCache.get(id); return !(hit && now-hit.at<15*60*1000);});
  const rows=await mapLimit(missing,4,async id=>{
    await waitBlingImageSlot();
    const data=await blingFetch(`/produtos/${encodeURIComponent(id)}`);
    const detail=data?.data||data||{};
    const urls=collectImageValues(detail);
    blingImageMemoryCache.set(id,{at:Date.now(),urls});
    return [id,urls];
  });
  const images={};
  unique.forEach(id=>{ const hit=blingImageMemoryCache.get(id); if(hit) images[id]=hit.urls||[]; });
  rows.filter(Boolean).forEach(([id,urls])=>{images[id]=urls||[]});
  return images;
}

async function getAllProducts(){
  const all=[];
  for(let page=1;page<=100;page++){
    const data=await blingFetch(`/produtos?pagina=${page}&limite=100`);
    const rows=Array.isArray(data?.data)?data.data:[];
    all.push(...rows);
    if(rows.length<100) break;
  }
  return all;
}


function buildSaleOrder(payload={}){
  if(payload.blingPayload) return payload.blingPayload;
  const c=payload.customer||{}; const d=payload.delivery||{}; const totals=payload.totals||{};
  const paymentLabel={pix_online:'Pix online',pix:'Pix pelo atendimento',cash:'Dinheiro',card:'Cartão'}[payload.payment]||String(payload.payment||'A definir');
  const items=(payload.items||[]).map(i=>{
    const productId=Number(i.productId);
    const item={quantidade:Number(i.quantity)||1,valor:Number(i.unitPrice)||0,descricao:String(i.name||'Produto')};
    if(Number.isFinite(productId)&&productId>0) item.produto={id:productId};
    return item;
  });
  const discountInfo=payload.discounts||{};
  const automaticDiscount=Number(discountInfo.automatic ?? totals.automaticDiscount ?? 0)||0;
  const couponDiscount=Number(discountInfo.coupon ?? totals.couponDiscount ?? 0)||0;
  const discountRules=Array.isArray(discountInfo.rules)?discountInfo.rules:[];
  const discountText=discountRules.length?discountRules.map(r=>`${r.name}: ${(Number(r.rate)||0)*100}% = R$ ${(Number(r.amount)||0).toFixed(2)}`).join(" | "):"Sem desconto automático";
  const order={
    ...(process.env.BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID ? {situacao:{id:Number(process.env.BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID)}} : {}),
    contato:{nome:String(c.name||'Cliente'),tipoPessoa:'F',numeroDocumento:String(c.cpf||'').replace(/\D/g,'')},
    itens:items,
    data:new Date().toISOString().slice(0,10),
    totalProdutos:Number(totals.subtotal)||0,
    total:Number(totals.total)||0,
    desconto:{valor:Number(totals.discount)||0,unidade:'REAL'},
    observacoes:`Checkout Relpps | Status: Aguardando pagamento | Pagamento: ${paymentLabel} | Desconto automático: R$ ${automaticDiscount.toFixed(2)} | Cupom: ${discountInfo.couponCode||'nenhum'} | Desconto cupom: R$ ${couponDiscount.toFixed(2)}`,
    observacoesInternas:`Status interno: Aguardando pagamento. Recebimento: ${d.method||'não informado'}. Regras aplicadas: ${discountText}.`,
    transporte:{fretePorConta:1,frete:Number(totals.shipping)||0,etiqueta:{nome:String(c.name||''),endereco:String(d.address||''),numero:String(d.number||''),complemento:String(d.complement||''),municipio:String(d.city||'').split('/')[0].trim(),uf:String(d.city||'').split('/')[1]?.trim()||'',cep:String(d.cep||'').replace(/\D/g,''),bairro:String(d.district||'')}}
  };
  return order;
}


function isAllowedImageHost(raw){
  try{
    const u=new URL(String(raw||""));
    const h=u.hostname.toLowerCase();
    return u.protocol==="https:" && (h==="bling.com.br" || h.endsWith(".bling.com.br"));
  }catch{return false;}
}

async function fetchBlingImage(rawUrl){
  if(!isAllowedImageHost(rawUrl)) throw new Error("URL de imagem não permitida.");
  const url=new URL(rawUrl);
  let r=await fetch(url,{headers:{"Accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8","User-Agent":"Relpps Cosméticos/1.0"}});
  if((r.status===401||r.status===403)){
    try{
      const token=await tokenFromRefresh();
      r=await fetch(url,{headers:{"Accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8","User-Agent":"Relpps Cosméticos/1.0","Authorization":`Bearer ${token}`,"enable-jwt":"1"}});
    }catch{}
  }
  if(!r.ok) throw new Error(`Imagem Bling HTTP ${r.status}`);
  const type=r.headers.get("content-type")||"image/jpeg";
  if(!/^image\//i.test(type)) throw new Error("Resposta não é imagem.");
  const buf=Buffer.from(await r.arrayBuffer());
  return {buf,type};
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";
    const action = event.queryStringParameters?.action || "products";

    if(action==="image-proxy"){
      const raw=event.queryStringParameters?.url||"";
      if(!raw) return json(400,{message:"Informe url."});
      try{
        const {buf,type}=await fetchBlingImage(raw);
        return {statusCode:200,headers:{"Content-Type":type,"Cache-Control":"public, max-age=3600, s-maxage=3600","X-Content-Type-Options":"nosniff"},isBase64Encoded:true,body:buf.toString("base64")};
      }catch(e){ return json(502,{message:e.message||"Falha ao carregar imagem do Bling."}); }
    }

    if(action==="health") return json(200,{ok:true,service:"Relpps ↔ Bling",oauthRedirect:redirectUri()});

    if(action==="authorize") {
      const clientId=process.env.BLING_CLIENT_ID;
      if(!clientId) return json(500,{message:"BLING_CLIENT_ID não configurado."});
      if(!oauthSecret()) return json(500,{message:"BLING_CLIENT_SECRET não configurado."});
      const state=signState({created_at:Date.now(),nonce:crypto.randomBytes(16).toString("hex")});
      const u=new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
      u.searchParams.set("response_type","code"); u.searchParams.set("client_id",clientId); u.searchParams.set("state",state);
      u.searchParams.set("redirect_uri",redirectUri());
      return {statusCode:302,headers:{Location:u.toString(),"Cache-Control":"no-store"},body:""};
    }

    if(action==="callback" && method==="POST") {
      const payload=JSON.parse(event.body||"{}");
      if(!payload.code || !payload.state) return json(400,{message:"code/state ausentes."});
      if(!verifyState(payload.state)) return json(400,{message:"State inválido ou expirado. Inicie a conexão novamente."});
      const data=await exchangeAuthorizationCode(payload.code);
      return json(200,{ok:true,connected:true,tokenType:data.token_type||"Bearer",expiresIn:data.expires_in||null});
    }

    if(action==="disconnect") { try { await clearBlingOAuth(); } catch(e) { console.warn("Falha ao limpar OAuth:",e.message); } return json(200,{ok:true,connected:false}); }

    if(action==="status") {
      let connected=false;
      try {
        const stored=await getBlingOAuth();
        connected=Boolean(process.env.BLING_ACCESS_TOKEN || stored?.access_token || process.env.BLING_REFRESH_TOKEN);
      } catch(e) { connected=Boolean(process.env.BLING_ACCESS_TOKEN || process.env.BLING_REFRESH_TOKEN); }
      return json(200,{ok:true,connected,oauthRedirect:redirectUri()});
    }

    if(action==="products"){
      const products=await getAllProducts();
      return json(200,{products});
    }

    if(action==="product-images"){
      const ids=String(event.queryStringParameters?.ids||"").split(",").map(x=>x.trim()).filter(Boolean);
      if(!ids.length) return json(400,{message:"Informe ids."});
      return json(200,{images:await getProductImageMap(ids)});
    }

    if(action==="product"){
      const id=event.queryStringParameters?.id;
      if(!id) return json(400,{message:"Informe id."});
      return json(200,await blingFetch(`/produtos/${encodeURIComponent(id)}`));
    }

    if(action==="stock"){
      const id=event.queryStringParameters?.id;
      if(!id) return json(400,{message:"Informe id."});
      // Endpoint de estoque por produto; mantemos a resposta do Bling para facilitar ajustes.
      return json(200,await blingFetch(`/estoques/saldos/${encodeURIComponent(id)}`));
    }

    if(action==="order" && method==="POST"){
      const payload=JSON.parse(event.body||"{}");
      /*
       * O site envia um pedido comercial já normalizado.
       * O bloco abaixo é um ponto seguro para mapear os campos da loja
       * ao schema de Pedido de Venda do Bling conforme a conta estiver configurada.
       */
      if(process.env.BLING_CREATE_ORDERS==="true"){
        const result=await blingFetch("/pedidos/vendas",{method:"POST",body:JSON.stringify(buildSaleOrder(payload))});
        return json(200,{ok:true,result});
      }
      return json(202,{ok:true,queued:false,message:"Pedido recebido pela loja. Ative BLING_CREATE_ORDERS=true após mapear o payload do Pedido de Venda do seu Bling.",received:payload});
    }

    return json(404,{message:"Ação não encontrada."});
  } catch (err) {
    console.error(err);
    return json(500,{message:err.message||"Erro interno"});
  }
};
