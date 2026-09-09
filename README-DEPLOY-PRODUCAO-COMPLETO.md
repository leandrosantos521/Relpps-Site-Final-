# Relpps — produção: Bling + InfinitePay + pedidos online

## Fluxo pronto

1. Cliente monta o carrinho.
2. Checkout calcula descontos e frete.
3. Backend valida estoque e preço diretamente no Bling.
4. O pedido de venda é criado no Bling em **Aguardando pagamento**.
5. Pix/cartão: é criado um Checkout Integrado da InfinitePay.
6. O cliente paga.
7. InfinitePay envia webhook; o backend consulta `payment_check` antes de aprovar.
8. O pedido interno vira `APPROVED` e o pedido do Bling muda para a situação de pago configurada.
9. Dinheiro: somente retirada presencial; pedido permanece **Aguardando pagamento** até pagamento no local.

## Variáveis no Netlify

Configure os segredos somente em **Project configuration → Environment variables**. Nunca coloque client secret, refresh token, service role key ou tokens no GitHub.

Obrigatórias:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REDIRECT_URI=https://SEU-DOMINIO/bling-callback.html`
- `BLING_OAUTH_STATE_SECRET`
- `BLING_CREATE_ORDERS=true`
- `BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID`
- `BLING_SITUACAO_PAGO_ID`
- `BLING_FORMA_PAGAMENTO_PIX_ID`
- `BLING_FORMA_PAGAMENTO_CARTAO_ID`
- `BLING_FORMA_PAGAMENTO_DINHEIRO_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL=https://SEU-DOMINIO`
- `INFINITEPAY_HANDLE=SuaInfiniteTag` (sem `$`)
- `CHECKOUT_TEST_MODE=false`

`BLING_REFRESH_TOKEN` pode ser usado como fallback, mas o fluxo OAuth do projeto salva/renova o token no backend.

## Bling

Abra no site a conexão do Bling e autorize a conta. O redirect de produção precisa ser exatamente o cadastrado no aplicativo do Bling.

Depois de autorizado, o backend usa a API v3 para validar produtos/estoque e criar o pedido de venda.

## InfinitePay

Ative **Checkout Integrado** no App/Web InfinitePay em Vendas → Checkout → Configurações. O checkout aceita Pix e cartão; o site não coleta nem armazena dados do cartão.

Webhook:
`https://SEU-DOMINIO/.netlify/functions/checkout?action=infinitepay-webhook`

O retorno volta para:
`https://SEU-DOMINIO/?checkout=infinitepay-return&order=REL-...`

## Segurança

Os arquivos `.env` e `.bling-tokens.json` foram removidos desta versão distribuível para impedir que credenciais sejam publicadas no GitHub. Use apenas as Environment Variables do Netlify.
