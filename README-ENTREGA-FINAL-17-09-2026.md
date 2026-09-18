# Relpps Cosméticos — pacote final de produção

Este ZIP é uma versão consolidada do site com foco em estabilidade, criação de pedidos no Bling, checkout InfinitePay, Correios via Melhor Envio e Uber/99 com frete manual lançado no Bling.

> **Importante:** nenhum ZIP consegue garantir literalmente zero falhas externas. Bling, Netlify, Supabase, Melhor Envio e InfinitePay dependem de credenciais, autorização, escopos e disponibilidade dos serviços. O pacote inclui validações e mensagens de diagnóstico para reduzir falhas e facilitar a correção.

## 1. Variáveis obrigatórias no Netlify

Em **Netlify → Site configuration → Environment variables**, cadastre:

```text
CHECKOUT_TEST_MODE=false
BLING_CREATE_ORDERS=true
PUBLIC_SITE_URL=https://relppscosmetic.netlify.app
STORE_POSTAL_CODE=72010901
STORE_PICKUP_ADDRESS=C 12, Área Especial 02, Loja 30 — Taguatinga Centro, Brasília - DF — CEP 72010-901
INFINITEPAY_HANDLE=rps210323
SUPABASE_URL=https://wsoetvctzybsdtsuydca.supabase.co
SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_SERVICE_ROLE_DO_SUPABASE
BLING_CLIENT_ID=COLE_AQUI
BLING_CLIENT_SECRET=COLE_AQUI
BLING_REFRESH_TOKEN=DEIXE_VAZIO_SE_VAI_CONECTAR_PELA_TELA_OAUTH
BLING_REDIRECT_URI=https://relppscosmetic.netlify.app/bling-callback.html
BLING_OAUTH_STATE_SECRET=CRIE_UMA_SENHA_FORTE_E_UNICA
MELHOR_ENVIO_CLIENT_ID=COLE_AQUI
MELHOR_ENVIO_CLIENT_SECRET=COLE_AQUI
MELHOR_ENVIO_CALLBACK_URL=https://relppscosmetic.netlify.app/melhor-envio-callback.html
MELHOR_ENVIO_TOKEN=DEIXE_VAZIO_SE_USAR_OAUTH
MELHOR_ENVIO_SANDBOX=false
MELHOR_ENVIO_USER_AGENT=Relpps Cosméticos (contato@relpps.com.br)
SHIPPING_QUOTE_SECRET=CRIE_UMA_SENHA_FORTE_E_UNICA
RELPPS_ADMIN_RELEASE_SECRET=CRIE_UMA_SENHA_FORTE_E_UNICA
UBER_DIRECT_ENABLED=false
```

As três senhas acima podem ser diferentes. **Não coloque segredos no Git, no HTML, no `config.js` ou no ZIP público.**

Depois de alterar variáveis no Netlify, faça um novo deploy para que as Functions recebam os valores atualizados.

## 2. Supabase

Execute `SUPABASE-CORRIGIR-AGORA.sql` no SQL Editor. Ele cria/garante:

- `public.relpps_orders`
- `public.relpps_bling_oauth`
- `public.relpps_melhor_envio_oauth`

## 3. Bling

No aplicativo Relpps, deixe os escopos necessários habilitados. Como você já informou que estão todos selecionados, não é necessário reduzir a lista.

Depois de salvar os escopos, faça a autorização novamente por:

`https://relppscosmetic.netlify.app/api/bling?action=authorize`

Callback cadastrado no Bling:

`https://relppscosmetic.netlify.app/bling-callback.html`

### Webhook automático do frete Uber

No Bling → Webhooks → Pedido de Venda → **Atualizado**, use:

`https://relppscosmetic.netlify.app/.netlify/functions/bling-webhook-background`

O webhook verifica a assinatura HMAC e, quando encontra um pedido Relpps de Uber com `transporte.frete > 0`, lê o pedido completo, calcula o total final e libera o checkout InfinitePay.

## 4. Fluxos

### Correios / Melhor Envio
Cliente informa CEP → site consulta Melhor Envio → somente opções dos Correios são exibidas → cliente escolhe PAC/SEDEX → cria pedido → checkout InfinitePay com produto + frete.

### Uber / 99
Cliente escolhe Uber/99 → cria pedido sem pagamento → pedido entra no Bling com frete a calcular → loja lança o valor em **Transporte → Frete** → webhook atualiza o total → site libera o botão de pagamento com produto + frete.

O site também mantém `/liberar-pedido.html` como caminho manual de contingência.

## 5. Diagnóstico

Após publicar, abra:

`https://relppscosmetic.netlify.app/api/health`

O endpoint retorna somente estados booleanos e avisos; não retorna chaves secretas.

## 6. InfinitePay

O checkout usa:

- `POST https://api.checkout.infinitepay.io/links`
- `POST https://api.checkout.infinitepay.io/payment_check`
- webhook em `/.netlify/functions/checkout?action=infinitepay-webhook`

Os preços enviados à InfinitePay são convertidos para centavos.

## 7. Teste final recomendado

1. Abra `/api/health`.
2. Reautorize o Bling depois de salvar os escopos.
3. Confirme o webhook de Pedido de Venda → Atualizado.
4. Crie um pedido pequeno pelo site.
5. Confirme que o pedido aparece no Bling.
6. Teste um pedido Uber e lance um frete de teste no Bling.
7. Confira se o botão de pagamento aparece em `pedido.html`.
8. Teste Pix e cartão pela InfinitePay.

### Segurança
Nunca envie `SUPABASE_SERVICE_ROLE_KEY`, `BLING_CLIENT_SECRET`, `MELHOR_ENVIO_CLIENT_SECRET` ou senhas administrativas pelo chat. Elas devem ser inseridas somente no Netlify.
