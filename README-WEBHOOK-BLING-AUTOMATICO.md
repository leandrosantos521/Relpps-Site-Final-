# Webhook Bling — Liberação automática do pagamento Uber

O Relpps agora possui um endpoint de webhook para o evento `order.updated` do Bling.

## URL para cadastrar no Bling

Alias:
`Relpps`

URL:
`https://relppscosmetic.netlify.app/.netlify/functions/bling-webhook-background`

## Configuração no Bling

1. O aplicativo precisa ter o escopo `order`.
2. Em **Webhooks → Configuração de servidores**, crie/edite o servidor acima.
3. Em **Pedidos de Vendas**, selecione o servidor `Relpps`.
4. Ative a ação **Atualizado (`updated`)**.
5. Salve os webhooks.
6. Se os escopos do aplicativo foram alterados, faça uma nova autorização OAuth do Relpps.

## O que acontece

1. Cliente escolhe **Uber / 99**.
2. O pedido é criado no Bling sem frete definido.
3. A loja calcula o Uber e coloca o valor em **Transporte → Frete** no pedido do Bling.
4. O Bling envia `order.updated` para o Relpps.
5. O Relpps valida `X-Bling-Signature-256` com o `BLING_CLIENT_SECRET`.
6. O Relpps confirma que o pedido possui `RELPPS_META` com `method: "uber"` e que `transporte.frete > 0`.
7. O Relpps calcula **produtos - descontos + frete**.
8. O Relpps cria o checkout completo na InfinitePay.
9. O link de pagamento é salvo no pedido do site e aparece em `pedido.html`.

## Segurança

O endpoint não aceita webhook sem a assinatura HMAC oficial do Bling. O client secret permanece somente no backend/variáveis de ambiente.

## Observação

O webhook de Pedido de Venda só fica disponível no cadastro do aplicativo quando o escopo `order` está habilitado. O Bling informa que o webhook utiliza `X-Bling-Signature-256` e que uma entrega é considerada bem-sucedida quando o endpoint responde com HTTP 2xx em até 5 segundos.
