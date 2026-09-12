# Relpps — pedidos online + Bling + InfinitePay

## Fluxo implementado

1. Cliente finaliza o checkout.
2. Backend cria um pedido interno `REL-...` e salva no Supabase.
3. Backend valida produto/preço/estoque no Bling.
4. Backend cria o Pedido de Venda em `Vendas > Pedidos de venda` no Bling com situação de aguardando pagamento.
5. Frete, descontos e cupom entram no total do pedido.
6. Pix e cartão seguem para o Checkout Pro do InfinitePay.
7. InfinitePay chama o webhook do backend.
8. O backend consulta o pagamento diretamente no InfinitePay e só considera pago quando o status real for `approved`.
9. Depois da aprovação, o backend atualiza a situação do pedido no Bling para a situação configurada em `BLING_SITUACAO_PAGO_ID`.
10. Dinheiro não passa pelo gateway: fica aguardando pagamento para retirada presencial.

## Credenciais no Netlify

Nunca coloque secrets no `config.js`.

Configure como Environment Variables/Secrets:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`
- `BLING_CREATE_ORDERS=true`
- `BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID`
- `BLING_SITUACAO_PAGO_ID`
- `BLING_FORMA_PAGAMENTO_PIX_ID` (opcional; o backend tenta localizar por tipo/descrição)
- `BLING_FORMA_PAGAMENTO_CARTAO_ID` (opcional)
- `BLING_FORMA_PAGAMENTO_DINHEIRO_ID` (opcional)
- `INFINITEPAY_HANDLE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL=https://relppscosmeticoss.netlify.app`
- `STORE_PICKUP_ADDRESS=...`
- `CHECKOUT_TEST_MODE=false`

## Supabase

Execute o bloco `PEDIDOS ONLINE RELPPS` do `supabase-schema.sql` no SQL Editor.

## InfinitePay

O site usa Checkout Pro para Pix e cartão. O cliente é enviado ao ambiente do InfinitePay e volta para a Relpps depois do pagamento.

Configure o webhook da aplicação no InfinitePay para pagamentos. O backend também envia `notification_url` ao criar a preferência.

## Situações do Bling

Os IDs são específicos da conta. Não invente IDs. Crie/identifique na conta do Bling as situações que você quer usar para:

- Aguardando pagamento
- Pago / aprovado

Depois coloque os IDs nas variáveis do Netlify.

## Importante sobre estoque

Em produção, `BLING_CREATE_ORDERS=true` é obrigatório neste fluxo. Antes de cobrar, o backend consulta o produto pelo ID e valida estoque/preço no Bling. Isso evita confiar no preço enviado pelo navegador.

## Frete

O checkout já possui a Function de cotação. Para produção, configure o Melhor Envio e/ou Uber Direct com credenciais reais. O valor selecionado pelo checkout é enviado ao pedido do Bling.

## WhatsApp

O suporte pelo WhatsApp continua no checkout e no resultado do pedido. Altere `WHATSAPP_NUMBER` em `config.js` para o número comercial real, somente com DDI + DDD + número.
