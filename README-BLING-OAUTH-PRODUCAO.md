# Bling OAuth em produção — Relpps

## Link de redirecionamento no Bling

Use exatamente:

`https://relpps.com.br/bling-callback.html`

## Variáveis Netlify

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN` (fallback inicial)
- `BLING_REDIRECT_URI=https://relpps.com.br/bling-callback.html`
- `BLING_OAUTH_STATE_SECRET` (uma chave forte escolhida por você)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

A conexão autorizada pelo OAuth é armazenada na tabela `relpps_bling_oauth` do Supabase. O backend passa a usar o refresh token armazenado e renova os tokens quando necessário.

Antes de testar, execute o bloco de OAuth do arquivo `supabase-schema.sql` no Supabase.
