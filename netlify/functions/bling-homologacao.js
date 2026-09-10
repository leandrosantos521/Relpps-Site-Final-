const BLING_BASE = "https://api.bling.com.br/Api/v3";
const { getBlingOAuth, saveBlingOAuth } = require("./_lib/bling-oauth-store");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Para renovar o acesso durante a homologação, configure BLING_CLIENT_ID, BLING_CLIENT_SECRET e BLING_REFRESH_TOKEN no Netlify.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(`${BLING_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "enable-jwt": "1"
    },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data?.error?.description || data?.message || `Falha ao renovar token do Bling (HTTP ${response.status}).`);
  }

  data.saved_at = new Date().toISOString();
  if(data.expires_in) data.expires_at = new Date(Date.now() + Number(data.expires_in)*1000).toISOString();
  try { await saveBlingOAuth(data); } catch(e) { console.warn("Não foi possível salvar OAuth do Bling:", e.message); }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken
  };
}

async function apiRequest(path, method, body, state, homologationHash) {
  let retriedAfter401 = false;

  while (true) {
    const headers = {
      Authorization: `Bearer ${state.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "enable-jwt": "1"
    };

    if (homologationHash) headers["x-bling-homologacao"] = homologationHash;

    const response = await fetch(`${BLING_BASE}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) { data = text ? { raw: text } : {}; }

    if (response.status === 401 && !retriedAfter401) {
      retriedAfter401 = true;
      const refreshed = await refreshAccessToken(state.refreshToken);
      state.accessToken = refreshed.accessToken;
      state.refreshToken = refreshed.refreshToken;
      continue;
    }

    const nextHash = response.headers.get("x-bling-homologacao") || homologationHash || null;

    if (!response.ok) {
      // Preserve os detalhes completos de validação devolvidos pelo Bling.
      // Isso evita esconder o campo exato que causou um HTTP 400.
      const detail = data?.error?.description || data?.message || data?.error || data?.raw || `HTTP ${response.status}`;
      const full = (data && typeof data === "object") ? JSON.stringify(data) : String(detail);
      throw new Error(`${method} ${path} falhou (HTTP ${response.status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}${full !== String(detail) ? ` | resposta=${full}` : ""}`);
    }

    return { data, nextHash, status: response.status };
  }
}

function elapsed(start) {
  return Number(((Date.now() - start) / 1000).toFixed(3));
}

async function runHomologation() {
  const startedAt = Date.now();
  const stored = await getBlingOAuth().catch(()=>null);
  // Para a homologação, priorizamos SEMPRE o OAuth recém-conectado no Supabase.
  // Um BLING_ACCESS_TOKEN antigo no Netlify pode causar invalid_token mesmo quando
  // a conexão OAuth atual está válida. Como o Bling exige refresh token em uma das
  // etapas, renovamos antes do teste quando temos um refresh token salvo.
  let state = {
    accessToken: stored?.access_token || "",
    refreshToken: stored?.refresh_token || process.env.BLING_REFRESH_TOKEN || ""
  };
  if (state.refreshToken) {
    const refreshed = await refreshAccessToken(state.refreshToken);
    state = refreshed;
  } else if (!state.accessToken) {
    throw new Error("Bling conectado não possui refresh token salvo. Reconecte o aplicativo pelo botão Conectar ao Bling.");
  }
  let hash = null;
  const steps = [];

  // 1) GET — pega o produto de referência que será usado no POST.
  const getResult = await apiRequest("/homologacao/produtos", "GET", undefined, state, hash);
  hash = getResult.nextHash;
  const reference = getResult.data?.data;
  if (!reference || typeof reference !== "object") {
    throw new Error("O GET de homologação não retornou a propriedade data esperada.");
  }
  steps.push({ step: 1, method: "GET", status: getResult.status, seconds: elapsed(startedAt), ok: true });

  // 2) POST — envia exatamente os dados recebidos no GET.
  const postResult = await apiRequest("/homologacao/produtos", "POST", reference, state, hash);
  hash = postResult.nextHash;
  const created = postResult.data?.data || postResult.data || {};
  const productId = created?.id;
  if (!productId) throw new Error("O POST de homologação não retornou o id do produto criado.");
  steps.push({ step: 2, method: "POST", status: postResult.status, seconds: elapsed(startedAt), ok: true, productId });

  // 3) PUT — atualiza o produto usando EXATAMENTE o payload aceito pelo endpoint
  // de homologação. A referência oficial atual do endpoint PUT define somente
  // nome, preco e codigo no body; o ID fica exclusivamente no path.
  // Para cumprir a etapa de alteração indicada no guia de homologação,
  // alteramos o nome para "Copo".
  const updatedProduct = {
    nome: "Copo",
    preco: Number(reference.preco),
    codigo: String(reference.codigo)
  };
  const putResult = await apiRequest(`/homologacao/produtos/${encodeURIComponent(productId)}`, "PUT", updatedProduct, state, hash);
  hash = putResult.nextHash;
  steps.push({ step: 3, method: "PUT", status: putResult.status, seconds: elapsed(startedAt), ok: true, productId });

  // 4) PATCH — inativa o produto.
  const patchResult = await apiRequest(`/homologacao/produtos/${encodeURIComponent(productId)}/situacoes`, "PATCH", { situacao: "I" }, state, hash);
  hash = patchResult.nextHash;
  steps.push({ step: 4, method: "PATCH", status: patchResult.status, seconds: elapsed(startedAt), ok: true, productId });

  // 5) DELETE — remove o produto de representação.
  const deleteResult = await apiRequest(`/homologacao/produtos/${encodeURIComponent(productId)}`, "DELETE", undefined, state, hash);
  hash = deleteResult.nextHash;
  steps.push({ step: 5, method: "DELETE", status: deleteResult.status, seconds: elapsed(startedAt), ok: true, productId });

  const totalSeconds = elapsed(startedAt);
  if (totalSeconds > 10) {
    throw new Error(`O teste terminou em ${totalSeconds}s, acima do limite de 10s do Bling. Refazer a execução.`);
  }

  return {
    ok: true,
    message: "Homologação do Bling executada com sucesso: GET → POST → PUT → PATCH → DELETE.",
    totalSeconds,
    productId,
    steps,
    note: "O hash x-bling-homologacao foi encadeado entre as requisições e o refresh token foi usado quando necessário."
  };
}

exports.handler = async (event) => {
  try {
    if ((event.httpMethod || "POST") !== "POST") {
      return json(405, { ok: false, message: "Use POST para executar a homologação." });
    }

    const expectedSecret = String(process.env.HOMOLOGATION_SECRET || "").trim();
    if (!expectedSecret) {
      return json(503, {
        ok: false,
        message: "Configure HOMOLOGATION_SECRET no Netlify antes de executar a homologação."
      });
    }

    const receivedSecret = String(event.headers?.["x-relpps-homologation-secret"] || event.headers?.["X-Relpps-Homologation-Secret"] || "").trim();
    if (!receivedSecret || receivedSecret !== expectedSecret) {
      return json(401, { ok: false, message: "Não autorizado." });
    }

    return json(200, await runHomologation());
  } catch (error) {
    console.error("Bling homologação:", error);
    return json(500, {
      ok: false,
      message: error?.message || "Falha na homologação do Bling."
    });
  }
};
