const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5500);
const HOST = process.env.HOST || '127.0.0.1';
const BLING_BASE = 'https://api.bling.com.br/Api/v3';
const TOKEN_FILE = path.join(ROOT, '.bling-tokens.json');
const STATE_FILE = path.join(ROOT, '.bling-oauth-state.json');
const PRODUCT_CACHE_FILE = path.join(ROOT, '.bling-products-cache.json');

function loadEnv(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[m[1]] = value;
  }
}
loadEnv();

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(data);
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
}

function requireBlingConfig() {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET no arquivo .env.');
  return { clientId, clientSecret };
}

function callbackUrl() {
  return process.env.BLING_REDIRECT_URI || `http://${HOST}:${PORT}/bling-callback.html`;
}

async function exchangeCode(code) {
  const { clientId, clientSecret } = requireBlingConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code });
  const r = await fetch(`${BLING_BASE}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'enable-jwt': '1' },
    body
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.description || data?.message || `Bling OAuth HTTP ${r.status}`);
  writeJson(TOKEN_FILE, { ...data, saved_at: new Date().toISOString() });
  return data;
}

async function accessToken() {
  const tokens = readJson(TOKEN_FILE);
  if (!tokens?.access_token) throw new Error('Bling ainda não está conectado.');
  const expiresAt = tokens.saved_at && tokens.expires_in ? new Date(tokens.saved_at).getTime() + Number(tokens.expires_in) * 1000 : 0;
  if (!expiresAt || Date.now() < expiresAt - 60_000) return tokens.access_token;

  if (!tokens.refresh_token) throw new Error('Token do Bling expirado e sem refresh_token.');
  const { clientId, clientSecret } = requireBlingConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
  const r = await fetch(`${BLING_BASE}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'enable-jwt': '1' },
    body
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.description || data?.message || `Bling refresh HTTP ${r.status}`);
  writeJson(TOKEN_FILE, { ...data, saved_at: new Date().toISOString() });
  return data.access_token;
}

async function blingFetch(apiPath, options = {}) {
  const token = await accessToken();
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'enable-jwt': '1', ...(options.headers || {}) };
  const r = await fetch(`${BLING_BASE}${apiPath}`, { ...options, headers });
  const text = await r.text();
  let data = {}; try { data = JSON.parse(text); } catch {}
  if (!r.ok) throw new Error(data?.error?.description || data?.message || `Bling HTTP ${r.status}`);
  return data;
}

function unwrapProductDetail(payload) {
  if (!payload) return {};
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, run));
  return out;
}

function collectImageValues(value, out = [], seen = new Set(), key = '') {
  if (!value) return out;
  const imageKey = /^(imagem|imagens|imagemurl|urlimagem|imagemprincipal|foto|fotos|image|images|url|link|href|src|arquivo|anexo|media|midia)$/i;
  const looksImage = x => /\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(x) || /bling\.com\.br|cdn|image|imagem|foto/i.test(x);
  if (typeof value === 'string') {
    const x = value.trim();
    if (/^https?:\/\//i.test(x) && (imageKey.test(String(key)) || looksImage(x)) && !seen.has(x)) { seen.add(x); out.push(x); }
    return out;
  }
  if (Array.isArray(value)) { value.forEach(v => collectImageValues(v, out, seen, key)); return out; }
  if (typeof value === 'object') {
    for (const [k,v] of Object.entries(value)) {
      if (imageKey.test(k) || typeof v === 'object') collectImageValues(v, out, seen, k);
    }
  }
  return out;
}

function mergeProductSummaryAndDetail(summary, detail) {
  const merged = { ...summary, ...(detail || {}) };
  // Preserva campos úteis da listagem e combina as imagens vindas de qualquer nível.
  for (const key of ['imagem','imagens','marca','categoria','estoque','preco','precoVenda','descricao','descricaoCurta','descricaoComplementar']) {
    if ((merged[key] === undefined || merged[key] === null || merged[key] === '') && summary[key] !== undefined) merged[key] = summary[key];
  }
  const imageUrls = [...collectImageValues(detail), ...collectImageValues(summary)];
  if (imageUrls.length) {
    merged.imagens = imageUrls.map(url => ({ url }));
    merged.imagem = merged.imagem || { url: imageUrls[0] };
    merged.imagemPrincipal = merged.imagemPrincipal || imageUrls[0];
  }
  return merged;
}

async function allProducts() {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const data = await blingFetch(`/produtos?pagina=${page}&limite=100`);
    const rows = Array.isArray(data?.data) ? data.data : [];
    all.push(...rows);
    if (rows.length < 100) break;
  }

  // A listagem do Bling pode não trazer descrição, marca ou imagens completas.
  // Busca os detalhes de cada produto e preserva a listagem caso algum detalhe falhe.
  const detailed = await mapLimit(all, 5, async (summary) => {
    const id = summary?.id;
    if (!id) return summary;
    try {
      const detailPayload = await blingFetch(`/produtos/${encodeURIComponent(id)}`);
      return mergeProductSummaryAndDetail(summary, unwrapProductDetail(detailPayload));
    } catch (err) {
      console.warn(`[Bling] Detalhe do produto ${id} não carregou; usando resumo.`, err.message);
      return summary;
    }
  });

  try { writeJson(PRODUCT_CACHE_FILE, { saved_at: new Date().toISOString(), products: detailed }); } catch {}
  return detailed;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}


async function proxyBlingImage(req, res, rawUrl) {
  let target;
  try { target = new URL(String(rawUrl || '')); } catch { return json(res, 400, { message: 'URL de imagem inválida.' }); }
  if (!/^https?:$/.test(target.protocol)) return json(res, 400, { message: 'Protocolo inválido.' });
  const host = target.hostname.toLowerCase();
  // Bloqueia somente destinos locais/privados. CDNs de fornecedores podem variar.
  if (host === 'localhost' || host === '::1' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return json(res, 400, { message: 'Host de imagem não permitido.' });
  try {
    let r = await fetch(target, { headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8', 'User-Agent': 'Relpps-Catalog/1.0' }, redirect: 'follow' });
    if ((!r.ok || !String(r.headers.get('content-type') || '').startsWith('image/'))) {
      try {
        const token = await accessToken();
        r = await fetch(target, { headers: { Authorization: `Bearer ${token}`, Accept: 'image/*,*/*;q=0.8' }, redirect: 'follow' });
      } catch {}
    }
    if (!r.ok) throw new Error(`Imagem HTTP ${r.status}`);
    const type = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'Content-Length': buf.length, 'X-Content-Type-Options': 'nosniff' });
    return res.end(buf);
  } catch (err) {
    console.warn('[Bling imagem]', err.message);
    return json(res, 502, { message: 'Não foi possível carregar a imagem do produto.' });
  }
}

async function api(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const action = url.searchParams.get('action') || 'status';

  try {
    if (action === 'status') {
      const tokens = readJson(TOKEN_FILE);
      return json(res, 200, { connected: !!tokens?.access_token, savedAt: tokens?.saved_at || null });
    }

    if (action === 'authorize') {
      const { clientId } = requireBlingConfig();
      const state = crypto.randomBytes(24).toString('hex');
      writeJson(STATE_FILE, { state, created_at: Date.now() });
      const authorize = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
      authorize.searchParams.set('response_type', 'code');
      authorize.searchParams.set('client_id', clientId);
      authorize.searchParams.set('state', state);
      authorize.searchParams.set('redirect_uri', callbackUrl());
      res.writeHead(302, { Location: authorize.toString(), 'Cache-Control': 'no-store' });
      return res.end();
    }

    if (action === 'callback' && req.method === 'POST') {
      const body = await parseBody(req);
      const saved = readJson(STATE_FILE);
      if (!body.code || !body.state) return json(res, 400, { message: 'code/state ausentes.' });
      if (!saved?.state || saved.state !== body.state || Date.now() - Number(saved.created_at || 0) > 10 * 60 * 1000) {
        return json(res, 400, { message: 'State inválido ou expirado. Inicie a conexão novamente.' });
      }
      const data = await exchangeCode(body.code);
      try { fs.unlinkSync(STATE_FILE); } catch {}
      return json(res, 200, { ok: true, connected: true, tokenType: data.token_type, expiresIn: data.expires_in });
    }

    if (action === 'disconnect') {
      try { fs.unlinkSync(TOKEN_FILE); } catch {}
      return json(res, 200, { ok: true, connected: false });
    }

    if (action === 'image') {
      return proxyBlingImage(req, res, url.searchParams.get('url'));
    }
    if (action === 'products') {
      try { return json(res, 200, { products: await allProducts(), source: 'bling' }); }
      catch (err) {
        const cached = readJson(PRODUCT_CACHE_FILE);
        if (Array.isArray(cached?.products) && cached.products.length) return json(res, 200, { products: cached.products, source: 'cache', stale: true, warning: err.message });
        throw err;
      }
    }
    if (action === 'product') {
      const id = url.searchParams.get('id');
      if (!id) return json(res, 400, { message: 'Informe id.' });
      return json(res, 200, await blingFetch(`/produtos/${encodeURIComponent(id)}`));
    }
    if (action === 'stock') {
      const id = url.searchParams.get('id');
      if (!id) return json(res, 400, { message: 'Informe id.' });
      return json(res, 200, await blingFetch(`/estoques/saldos/${encodeURIComponent(id)}`));
    }
    if (action === 'order' && req.method === 'POST') {
      const body = await parseBody(req);
      if (process.env.BLING_CREATE_ORDERS === 'true') {
        return json(res, 200, { ok: true, result: await blingFetch('/pedidos/vendas', { method: 'POST', body: JSON.stringify(body.blingPayload || body) }) });
      }
      return json(res, 202, { ok: true, queued: false, message: 'Pedido recebido. BLING_CREATE_ORDERS ainda está false.', received: body });
    }

    return json(res, 404, { message: 'Ação não encontrada.' });
  } catch (err) {
    console.error('[Bling]', err);
    return json(res, 500, { message: err.message || 'Erro interno' });
  }
}


function cleanCep(v){ return String(v||'').replace(/\D/g,'').slice(0,8); }
function localShippingQuote(body){
  const cep=cleanCep(body.cep); const items=Array.isArray(body.items)?body.items:[];
  if(cep.length!==8) throw new Error('CEP inválido.');
  const qty=items.reduce((n,i)=>n+Math.max(1,Number(i.quantity)||1),0); const seed=Number(cep.slice(-3)||0); const base=Math.max(12,Math.min(49,12+(seed%21)+qty*1.8));
  return {melhor_envio:[{id:'test-correios-pac',name:'Correios PAC',company:'Correios',price:Number(base.toFixed(2)),delivery_time:5+(seed%5)},{id:'test-correios-sedex',name:'Correios SEDEX',company:'Correios',price:Number((base+12.9).toFixed(2)),delivery_time:2+(seed%3)}],uber:{id:'test-uber-moto',name:'Uber Moto',company:'Uber Direct',price:Number((Math.max(9,base*.78)).toFixed(2)),eta:'estimativa local'},testMode:true};
}
async function localCheckoutApi(req,res,url){
  const action=url.searchParams.get('action')||'create'; const body=await parseBody(req);
  if(action==='create'){
    const id=`REL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    return json(res,201,{ok:true,testMode:true,order:{...body,id,status:'Aguardando pagamento',paymentStatus:'Aguardando pagamento',createdAt:new Date().toISOString(),fulfillmentStatus:'Bloqueado até confirmação do pagamento'}});
  }
  if(action==='release'){
    const order=body.order; if(!order)return json(res,400,{message:'Pedido ausente.'});
    const fulfillmentStatus=order.delivery?.method==='pickup'?'Liberado para preparação e retirada':'Liberado para preparação e entrega';
    return json(res,200,{ok:true,testMode:true,order:{...order,status:'Pagamento aprovado',paymentStatus:'Aprovado',fulfillmentStatus,releasedAt:new Date().toISOString()}});
  }
  return json(res,404,{message:'Ação não encontrada.'});
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(path.resolve(ROOT))) return json(res, 403, { message: 'Acesso negado.' });
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return json(res, 404, { message: 'Arquivo não encontrado.' });
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (url.pathname === '/api/bling' || url.pathname.startsWith('/.netlify/functions/bling')) return api(req, res, url);
  if ((url.pathname === '/api/shipping' || url.pathname.startsWith('/.netlify/functions/shipping')) && req.method === 'POST') { try { const body=await parseBody(req); return json(res,200,localShippingQuote(body)); } catch(e){ return json(res,400,{message:e.message||'Erro ao calcular frete.'}); } }
  if ((url.pathname === '/api/checkout' || url.pathname.startsWith('/.netlify/functions/checkout')) && req.method === 'POST') return localCheckoutApi(req,res,url);
  return serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => console.log(`Relpps local: http://${HOST}:${PORT}/`));
