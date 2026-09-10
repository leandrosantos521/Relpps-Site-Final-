# Relpps + InfinitePay + Bling

## Fluxo

1. Cliente fecha o carrinho.
2. Backend valida preço e estoque diretamente no Bling.
3. Backend cria o Pedido de Venda no Bling em **Aguardando pagamento**.
4. Pix ou cartão: backend cria um Checkout Integrado na InfinitePay e redireciona o cliente para o pagamento.
5. InfinitePay envia o webhook quando o pagamento é aprovado.
6. Backend consulta `payment_check` na InfinitePay e valida o valor pago antes de considerar o pedido quitado.
7. Pedido interno passa para `PAID` e o pedido do Bling é alterado para a situação configurada em `BLING_SITUACAO_PAGO_ID`.
8. Dinheiro continua somente para retirada presencial e fica aguardando pagamento.

## Variável obrigatória

No Netlify:

`INFINITEPAY_HANDLE=SuaInfiniteTag`

Use a InfiniteTag **sem o `$`**.

Também mantenha:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`
- `BLING_CREATE_ORDERS=true`
- `BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID`
- `BLING_SITUACAO_PAGO_ID`
- `BLING_FORMA_PAGAMENTO_PIX_ID`
- `BLING_FORMA_PAGAMENTO_CARTAO_ID`
- `BLING_FORMA_PAGAMENTO_DINHEIRO_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL=https://relppscosmeticos.netlify.app`
- `CHECKOUT_TEST_MODE=false`

## URLs

Webhook:

`https://relppscosmeticos.netlify.app/.netlify/functions/checkout?action=infinitepay-webhook`

A InfinitePay também recebe essa URL automaticamente no payload de criação do checkout.

Retorno:

`https://relppscosmeticos.netlify.app/?checkout=infinitepay-return&order=REL-...`

## Importante

Nunca coloque `INFINITEPAY_HANDLE` como segredo no `config.js`. O handle pode ser usado pelo backend, mas as chamadas da API e a lógica de confirmação ficam no Netlify Function.

O checkout usa preços em centavos e envia o campo `items`, conforme o exemplo atual da documentação/central de ajuda da InfinitePay.


## Antes de publicar

No App/Web InfinitePay, habilite **Checkout Integrado** em Vendas → Checkout → Configurações. Depois coloque sua InfiniteTag em `INFINITEPAY_HANDLE` no Netlify, sem o `$`.
