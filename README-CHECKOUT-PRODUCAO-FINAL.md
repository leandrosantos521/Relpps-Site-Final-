# Relpps — checkout de produção

## Variáveis Netlify obrigatórias

- `CHECKOUT_TEST_MODE=false`
- `BLING_CREATE_ORDERS=true`
- `PUBLIC_SITE_URL=https://SEU-SITE.netlify.app`
- `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` / `BLING_REDIRECT_URI`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_HANDLE`
- `MELHOR_ENVIO_TOKEN`
- `MELHOR_ENVIO_SANDBOX=false`
- `STORE_POSTAL_CODE=72010901`
- `STORE_PICKUP_ADDRESS=Quadra C 12, Área Especial 02, Loja 30 — Taguatinga Centro, Brasília - DF — CEP 72010-901`
- `STORE_PICKUP_PHONE=+5561996498557`
- `RELPPS_ADMIN_RELEASE_SECRET=` uma senha forte escolhida por você

### Uber Direct

A integração usa OAuth 2.0 Client Credentials e os endpoints de quote/delivery do Uber Direct. A Uber informa que o acesso às APIs pode exigir aprovação escrita e que o Customer ID é específico da organização. Configure:

- `UBER_DIRECT_ENABLED=true`
- `UBER_DIRECT_CLIENT_ID`
- `UBER_DIRECT_CLIENT_SECRET`
- `UBER_DIRECT_CUSTOMER_ID`

Sem essas credenciais/aprovação, o site não inventa preços: a opção Uber fica indisponível.

### Fluxo de retirada via Uber

1. Cliente paga via InfinitePay.
2. Pedido fica `Aguardando liberação da loja`.
3. Funcionário abre `/liberar-pedido.html`, informa pedido + segredo e libera.
4. Cliente vê o botão `SOLICITAR UBER` em `/pedido.html?order=...`.
5. O backend cria a entrega no Uber Direct usando a cotação salva e retorna o rastreamento.

### Políticas

A política do site foi estruturada considerando o direito de arrependimento de 7 dias do art. 49 do CDC, o Decreto 7.962/2013 para comércio eletrônico e a LGPD (Lei 13.709/2018).
