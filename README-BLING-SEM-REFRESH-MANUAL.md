# BLING — conexão correta sem digitar REFRESH TOKEN

## O erro visto no checkout
A mensagem antiga `Bling não configurado no Netlify: BLING_REFRESH_TOKEN/CLIENT_ID/CLIENT_SECRET` não deve mais aparecer no checkout.

O projeto agora usa OAuth do Bling para obter automaticamente `access_token` e `refresh_token` e grava os dois em `public.relpps_bling_oauth` no Supabase.

## Você NÃO deve inventar nem copiar um refresh token
O refresh token é devolvido pelo próprio Bling quando a autorização OAuth é concluída.

## Variáveis obrigatórias no Netlify
Configure somente:

- `PUBLIC_SITE_URL=https://relppscosmetico.netlify.app`
- `BLING_REDIRECT_URI=https://relppscosmetico.netlify.app/bling-callback.html`
- `BLING_CLIENT_ID=<seu Client ID do Bling>`
- `BLING_CLIENT_SECRET=<seu Client Secret do Bling>`
- `BLING_OAUTH_STATE_SECRET=<um segredo aleatório seu>`
- `SUPABASE_URL=<URL do projeto Supabase>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key do Supabase>`
- `BLING_CREATE_ORDERS=true`
- `CHECKOUT_TEST_MODE=false`
- `INFINITEPAY_HANDLE=rps210323`

`BLING_REFRESH_TOKEN` pode ficar vazio quando a conexão OAuth estiver funcionando.

## Primeiro teste após o deploy
Abra:

`https://relppscosmetico.netlify.app/api/bling?action=status`

O JSON precisa mostrar:

- `connected: true`
- `storageConfigured: true`
- `oauthSaved: true`
- `clientConfigured: true`

Se `connected` estiver false, abra:

`https://relppscosmetico.netlify.app/api/bling?action=authorize`

Autorize a conta do Bling e aguarde a página `Bling conectado`.

## Callback cadastrado no Bling

`https://relppscosmetico.netlify.app/bling-callback.html`

O endereço deve estar exatamente assim no aplicativo do Bling.

## Supabase
Antes da autorização, execute `SUPABASE-CORRIGIR-AGORA.sql` no SQL Editor. A tabela `relpps_bling_oauth` é obrigatória para guardar o refresh token automaticamente.

## Segurança
Nunca coloque `BLING_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` ou tokens do Bling no `app.js`, `config.js`, GitHub ou chat.
