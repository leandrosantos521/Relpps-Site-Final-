# RELPPS — pacote final de produção

Domínio configurado: `https://relppscosmeticoss.netlify.app`

## Correções desta versão
- Imagens do Bling são carregadas pelo backend/proxy quando o CDN não permite acesso direto do navegador.
- O catálogo consulta o detalhe do produto para recuperar todas as URLs de imagens.
- A hidratação das fotos é feita em lotes para respeitar o limite de 3 requisições/segundo da API do Bling.
- Retry automático para 401, 429 e erros 5xx do Bling.
- Cache em memória das imagens e cache local no navegador.
- OAuth/JWT do Bling mantém `enable-jwt: 1`.
- Checkout de produção exige `BLING_CREATE_ORDERS=true` e `CHECKOUT_TEST_MODE=false`.
- Segredos não são incluídos neste ZIP.

## Variáveis obrigatórias no Netlify
```text
BLING_CLIENT_ID=seu_client_id
BLING_CLIENT_SECRET=seu_client_secret
BLING_REFRESH_TOKEN=seu_refresh_token
BLING_CREATE_ORDERS=true
BLING_REDIRECT_URI=https://relppscosmeticoss.netlify.app/bling-callback.html
BLING_OAUTH_STATE_SECRET=uma_senha_aleatoria_forte
BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID=ID_REAL_DA_SUA_CONTA
BLING_SITUACAO_PAGO_ID=ID_REAL_DA_SUA_CONTA
INFINITEPAY_HANDLE=sua_infinite_tag
SUPABASE_URL=https://wsoetvctzybsdtsuydca.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_secret_key
PUBLIC_SITE_URL=https://relppscosmeticoss.netlify.app
CHECKOUT_TEST_MODE=false
NODE_VERSION=20
```

Os IDs de situação do Bling são específicos da conta e não devem ser inventados.

## Depois do deploy
1. Faça um novo deploy deste ZIP na Netlify.
2. Confirme as variáveis acima em **Project configuration → Environment variables**.
3. No aplicativo do Bling, o callback deve ser exatamente `https://relppscosmeticoss.netlify.app/bling-callback.html`.
4. Abra `https://relppscosmeticoss.netlify.app/api/health` para verificar o preflight.
5. Conecte o Bling em `/bling-connect.html` se estiver usando OAuth armazenado no Supabase.

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, `BLING_CLIENT_SECRET` ou `BLING_REFRESH_TOKEN` em `config.js` ou no GitHub.
