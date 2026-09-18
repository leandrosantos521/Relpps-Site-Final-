# RELPPS COSMÉTICOS — COMPLETÃO 2026

## O que esta versão entrega

### Checkout e frete
- Uber Direct com cotação real por CEP/endereço.
- Melhor Envio com **3 opções separadas** quando disponíveis: PAC, SEDEX e Mini Envios.
- O frete escolhido entra no total antes do pagamento.
- Cotação assinada no backend para impedir que o navegador altere o valor.

### Pedido e Bling
1. Cliente confirma o pedido.
2. O backend valida produto, preço e estoque no Bling.
3. O **Pedido de Venda** é criado no Bling antes do pagamento.
4. O valor do produto, desconto, frete e total são enviados ao Bling.
5. O contato do cliente é criado/localizado com validação de CPF para reduzir o erro de validação de contato.

### InfinitePay
- Pix e Cartão usam o Checkout Integrado da InfinitePay.
- O pedido já existe no Bling antes do redirecionamento.
- Após o pagamento, a InfinitePay chama o webhook e o site valida o pagamento pela API.
- O cliente retorna para `pedido.html?order=...`.

### Uber Direct
- Para entrega: a cotação é feita no checkout.
- O cliente paga o total com o frete Uber.
- Após pagamento aprovado, o backend tenta criar a entrega Uber Direct e salva o `tracking_url`.
- O cliente acompanha a entrega na página do pedido.

### Retiradas
- **Retirada presencial:** Pix/Cartão vão para InfinitePay; Dinheiro não passa pela InfinitePay.
- **Retirada via Uber / 99:** o cliente paga primeiro e aguarda a liberação da loja. Depois aparecem os botões para abrir Uber/99 e solicitar a corrida por conta própria.
- **Dinheiro:** o pedido fica aguardando liberação; depois da liberação aparece a localização da loja. O painel interno possui uma ação separada para confirmar o pagamento em dinheiro.

## Endereço da loja
C 12, AE 02, Loja 30 — Taguatinga Centro, Brasília - DF — CEP 72010-901

## Variáveis do Netlify
Veja `.env.example`. Nunca coloque `Client Secret`, `service_role`, `SHIPPING_QUOTE_SECRET` ou `RELPPS_ADMIN_RELEASE_SECRET` no navegador.

Principais variáveis:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REDIRECT_URI`
- `BLING_CREATE_ORDERS=true`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_HANDLE=rps210323`
- `UBER_DIRECT_ENABLED=true`
- `UBER_DIRECT_CUSTOMER_ID`
- `UBER_DIRECT_CLIENT_ID`
- `UBER_DIRECT_CLIENT_SECRET`
- `MELHOR_ENVIO_CLIENT_ID`
- `MELHOR_ENVIO_CLIENT_SECRET`
- `MELHOR_ENVIO_CALLBACK_URL`
- `SHIPPING_QUOTE_SECRET`
- `RELPPS_ADMIN_RELEASE_SECRET`
- `STORE_PICKUP_ADDRESS`

## URLs importantes

- Bling OAuth: `/bling-callback.html`
- Melhor Envio OAuth: `/melhor-envio-callback.html`
- Status do pedido: `/pedido.html?order=REL-...`
- Painel interno: `/liberar-pedido.html`
- Webhook InfinitePay: `/.netlify/functions/checkout?action=infinitepay-webhook`

## Importante antes de publicar
1. Faça o deploy do ZIP no Netlify.
2. Configure as variáveis do `.env.example` no ambiente de produção.
3. Autorize novamente o app privado do Bling que será usado pelo site, caso tenha trocado o Client ID/Secret.
4. Confirme o OAuth do Melhor Envio.
5. Confirme as credenciais de produção do Uber Direct.
6. Faça um pedido de teste com valor baixo.
7. Verifique o pedido em **Bling → Vendas → Pedidos de Venda**.
8. Faça o pagamento de teste na InfinitePay e confirme o retorno em `pedido.html`.

## Observação
A integração usa APIs oficiais. O Uber Direct exige credenciais de produção e conta aprovada para entregas reais. O Melhor Envio exige OAuth e token válido para cotação. O site não expõe os segredos no navegador.
