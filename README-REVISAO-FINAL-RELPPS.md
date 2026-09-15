# Revisão final Relpps

## Fluxos
- Melhor Envio: cotação real no carrinho/checkout; opção escolhida entra no total da InfinitePay.
- Uber Entregas: aparece como “A calcular”; pedido é criado no Bling sem cobrança. Depois de lançar o frete no Bling, `/liberar-pedido.html` sincroniza o valor e cria a cobrança do total na InfinitePay.
- Retirada presencial: Pix/Cartão reservam o pedido; Dinheiro não reserva e orienta o cliente a ir à loja.
- Via Uber/99 para retirada: não pede CEP; após pagamento, aguarda liberação da loja e mostra atalhos para Uber/99.
- Status: `pedido.html` atualiza automaticamente e diferencia aguardando frete, frete calculado, pagamento aprovado, pedido reservado e liberado.

## Variáveis Netlify
- `CHECKOUT_TEST_MODE=false`
- `BLING_CREATE_ORDERS=true`
- `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` ou OAuth armazenado no Supabase
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_HANDLE=rps210323`
- `MELHOR_ENVIO_CLIENT_ID` / `MELHOR_ENVIO_CLIENT_SECRET`
- `MELHOR_ENVIO_TOKEN` (token de produção obtido pelo OAuth)
- `MELHOR_ENVIO_SANDBOX=false`
- `STORE_POSTAL_CODE=72010901`
- `RELPPS_ADMIN_RELEASE_SECRET` e/ou `SHIPPING_QUOTE_SECRET`

Não publique segredos no frontend.
