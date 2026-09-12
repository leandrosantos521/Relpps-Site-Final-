# Relpps Cosméticos — Checkout InfinitePay + Bling

Esta versão corrige o fluxo de compra para:

1. Cliente escolhe **Pix** ou **Cartão**.
2. O backend cria o pedido no **Bling** com `numeroLoja = REL-...`.
3. O backend cria o checkout em `POST https://api.checkout.infinitepay.io/links`.
4. O cliente é redirecionado para o checkout seguro da InfinitePay.
5. InfinitePay aceita **Pix e cartão de crédito** no Checkout Integrado.
6. O webhook chama `payment_check` antes de considerar o pagamento aprovado.
7. O pedido volta para `pedido.html` mostrando **PAGAMENTO APROVADO** ou **AGUARDANDO PAGAMENTO**.
8. O botão de WhatsApp é exibido com mensagem específica do status.
9. Se `relpps_orders` ainda não existir no Supabase, o checkout **não trava**: usa Bling + InfinitePay como fonte de verdade do pedido/pagamento. Isso evita o erro `Could not find the table public.relpps_orders in the schema cache` mostrado na tela.

## Variáveis obrigatórias no Netlify

```text
PUBLIC_SITE_URL=https://relppscosmeticoss.netlify.app
CHECKOUT_TEST_MODE=false
BLING_CREATE_ORDERS=true

BLING_CLIENT_ID=SEU_CLIENT_ID
BLING_CLIENT_SECRET=SEU_CLIENT_SECRET
BLING_REDIRECT_URI=https://relppscosmeticoss.netlify.app/bling-callback.html
BLING_OAUTH_STATE_SECRET=UMA_SENHA_ALEATORIA_FORTE

INFINITEPAY_HANDLE=sua_infinite_tag_sem_$

SUPABASE_URL=https://wsoetvctzybsdtsuydca.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SECRET_DO_SUPABASE

BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID=ID_DA_SITUACAO
BLING_SITUACAO_PAGO_ID=ID_DA_SITUACAO
```

A chave `SUPABASE_SERVICE_ROLE_KEY` é secreta: coloque somente em Netlify Environment Variables. Nunca no `app.js`.

## InfinitePay

No painel/app da InfinitePay, o **Checkout Integrado** precisa estar habilitado e Pix/cartão precisam estar ativados em Meios de Pagamento.

O código usa:

- `POST https://api.checkout.infinitepay.io/links`
- `POST https://api.checkout.infinitepay.io/payment_check`
- webhook: `https://relppscosmeticoss.netlify.app/.netlify/functions/checkout?action=infinitepay-webhook`

O `handle` deve ser sua InfiniteTag sem `$`.

## Supabase

O checkout não depende mais da existência imediata de `public.relpps_orders`. Mesmo assim, recomenda-se executar `supabase-schema.sql` no SQL Editor para manter histórico persistente, cupons e reconciliação local.

## Bling OAuth

O callback precisa estar cadastrado exatamente como:

```text
https://relppscosmeticoss.netlify.app/bling-callback.html
```

Sem `/` no final e sem usar o domínio antigo com um único `s`.
