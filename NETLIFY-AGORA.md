# Relpps — configuração final no Netlify

## 1. Atenção ao erro "Exposed secrets detected"

`SUPABASE_URL` e a chave `SUPABASE_PUBLISHABLE_KEY` são valores públicos usados pelo navegador. NÃO marque esses dois valores como Secret no Netlify se eles também estiverem presentes no `config.js`.

As credenciais que devem ser Secret são:
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`
- `BLING_OAUTH_STATE_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_HANDLE` (pode ser mantido como variável de servidor)

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, Client Secret ou Refresh Token em `config.js`, HTML ou GitHub.

Se o Netlify já acusou um segredo exposto, remova a variável marcada como Secret que corresponde a um valor público do frontend e faça um novo deploy. Se um segredo real já foi commitado no GitHub, revogue/rotacione a credencial e remova-a do histórico antes de publicar novamente.

## 2. Bling — produção

No aplicativo Bling:

`https://relppscosmeticoss.netlify.app/bling-callback.html`

No Netlify:

`BLING_REDIRECT_URI=https://relppscosmeticoss.netlify.app/bling-callback.html`

Configure também:
- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_OAUTH_STATE_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

O `BLING_REFRESH_TOKEN` pode ficar inicialmente vazio se a conexão OAuth for feita pelo botão de conexão. Depois da autorização, o backend grava os tokens em `relpps_bling_oauth`.

## 3. Supabase

Execute no SQL Editor o bloco de `relpps_bling_oauth` do `supabase-schema.sql`.

## 4. Conexão

Depois de publicar, abra:

`https://relppscosmeticoss.netlify.app/bling-connect.html`

Clique em **CONECTAR AO BLING**. O Bling deve retornar para `bling-callback.html`.

## 5. Homologação

Depois de conectar, configure:

`HOMOLOGATION_SECRET=<uma senha escolhida por você>`

Abra:

`https://relppscosmeticoss.netlify.app/homologacao-bling.html`

O teste executa GET → POST → PUT → PATCH → DELETE e encadeia `x-bling-homologacao`.

## 6. Pedidos e InfinitePay

Para produção:
- `BLING_CREATE_ORDERS=true`
- `CHECKOUT_TEST_MODE=false`
- `INFINITEPAY_HANDLE=<sua InfiniteTag sem $>`
- `PUBLIC_SITE_URL=https://relppscosmeticoss.netlify.app`

No InfinitePay, habilite o Checkout Integrado.
