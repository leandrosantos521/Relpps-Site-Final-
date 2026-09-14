# Frete real — Melhor Envio + Uber Direct + InfinitePay

Esta versão calcula frete real no backend, após o CEP ser informado, e leva para o checkout da InfinitePay com o total final do pedido, incluindo o frete selecionado.

## 1. Netlify — variáveis obrigatórias

`CHECKOUT_TEST_MODE=false`
`SHIPPING_TEST_MODE=false`
`SHIPPING_QUOTE_SECRET=<uma chave longa e secreta>`
`STORE_POSTAL_CODE=72010901`
`STORE_PICKUP_STREET=C 12, Área Especial 02`
`STORE_PICKUP_NUMBER=Loja 30`
`STORE_PICKUP_DISTRICT=Taguatinga Centro`
`STORE_PICKUP_CITY=Brasília / DF`
`STORE_PICKUP_PHONE=+5561996498557`
`PUBLIC_SITE_URL=https://relppscosmeticoss.netlify.app`
`INFINITEPAY_HANDLE=rps210323`

## 2. Melhor Envio

Defina `MELHOR_ENVIO_TOKEN` com o token de produção autorizado para o aplicativo/conta e mantenha `MELHOR_ENVIO_SANDBOX=false`.

Para cotação são necessárias as permissões de frete/cotação do Melhor Envio e dimensões/peso corretos dos produtos. O código usa `custom_price` e `custom_delivery_time` quando retornados.

## 3. Uber Direct

Defina:

`UBER_DIRECT_ENABLED=true`
`UBER_DIRECT_CLIENT_ID=...`
`UBER_DIRECT_CLIENT_SECRET=...`
`UBER_DIRECT_CUSTOMER_ID=...`

A conta Uber Direct precisa estar aprovada para produção e com faturamento configurado.

## 4. Fluxo do cliente

1. Cliente informa o CEP.
2. O site consulta o ViaCEP e preenche endereço/cidade/UF.
3. O backend calcula Melhor Envio e Uber Direct.
4. As opções e preços reais aparecem no checkout.
5. Cliente escolhe uma opção.
6. O backend valida a cotação assinada para evitar alteração do preço do frete no navegador.
7. O pedido é criado no Bling com o frete.
8. A InfinitePay recebe o total final e o cliente é redirecionado para o pagamento.

## Segurança

Nunca envie `.env`, `.bling-tokens.json`, `MELHOR_ENVIO_TOKEN`, client secret do Uber, secret do Bling ou service role do Supabase para GitHub.
