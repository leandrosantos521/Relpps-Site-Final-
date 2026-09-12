# Relpps — publicação em produção (Netlify + Bling + InfinitePay)

## 1. Subir o projeto

No Netlify, crie/abra o site e publique a pasta raiz `RELPPS-CORRIGIDO` (não a pasta pai do ZIP). O arquivo `netlify.toml` já aponta `publish = "."` e `functions = "netlify/functions"`.

## 2. Variáveis do Netlify

Cadastre em **Site configuration → Environment variables** e deixe o escopo **Functions** habilitado para os segredos. Depois de alterar variáveis, faça um novo deploy.

Obrigatórias para checkout + Bling:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`
- `BLING_CREATE_ORDERS=true`
- `BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID`
- `BLING_SITUACAO_PAGO_ID`
- `BLING_FORMA_PAGAMENTO_PIX_ID`
- `BLING_FORMA_PAGAMENTO_CARTAO_ID`
- `BLING_FORMA_PAGAMENTO_DINHEIRO_ID`
- `INFINITEPAY_HANDLE` (sem `$`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL=https://relppscosmeticoss.netlify.app`
- `CHECKOUT_TEST_MODE=false`
- `STORE_PICKUP_ADDRESS=C 12, Área Especial 02, Loja 30 - Taguatinga Centro, Brasília - DF - CEP 72010-901`

Para frete real, também configure:

- `STORE_POSTAL_CODE`
- `MELHOR_ENVIO_TOKEN`
- `MELHOR_ENVIO_SANDBOX=false`
- `MELHOR_ENVIO_USER_AGENT=Relpps Cosméticos (contato@relpps.com.br)`

Não coloque `BLING_CLIENT_SECRET`, `BLING_REFRESH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` ou qualquer segredo no `config.js`.

## 3. Supabase

Execute `supabase-schema.sql` no SQL Editor do projeto. A tabela `relpps_orders` é usada pelo backend para acompanhar o pedido e a confirmação do pagamento.

## 4. InfinitePay

No App/Web InfinitePay, habilite **Checkout Integrado**. A documentação oficial informa que a InfiniteTag/handle é usada sem o `$`, e que a API de checkout usa `POST https://api.checkout.infinitepay.io/links`.

Webhook configurado pelo sistema:

`https://relppscosmeticoss.netlify.app/.netlify/functions/checkout?action=infinitepay-webhook`

A URL de retorno é gerada por pedido. O sistema usa `order_nsu`, `transaction_nsu` e `slug` e confirma o pagamento via `payment_check` antes de marcar o pedido como pago.

## 5. Bling

O backend usa a URL atual `https://api.bling.com.br/Api/v3`, OAuth/JWT e mantém os segredos somente no backend.

O pedido é criado no Bling em **Aguardando pagamento**. Depois da confirmação da InfinitePay, o backend tenta alterar o pedido para a situação indicada em `BLING_SITUACAO_PAGO_ID`.

## 6. Fluxos

### Pix / Cartão
1. Cliente finaliza o pedido.
2. Backend consulta preço/estoque no Bling.
3. Backend cria o pedido no Bling como aguardando pagamento.
4. Backend cria o checkout InfinitePay.
5. Cliente paga.
6. InfinitePay chama o webhook.
7. Backend confirma via `payment_check`.
8. Pedido interno fica `PAID` e o pedido Bling é alterado para pago.

### Dinheiro
- Disponível somente para retirada presencial.
- Pedido é criado no Bling como aguardando pagamento.
- Não há redirecionamento para InfinitePay.
- O cliente recebe o endereço da loja e o pedido permanece aguardando pagamento até o recebimento presencial.

## 7. Teste obrigatório antes de divulgar

Faça primeiro uma compra pequena de teste. Confirme: 

- pedido criado no Bling;
- situação `Aguardando pagamento`;
- link InfinitePay abre;
- Pix e cartão retornam para a Relpps;
- webhook chega;
- `payment_check` retorna `paid=true`;
- situação do Bling muda para `Pago`;
- valor final inclui desconto + frete corretamente;
- dinheiro fica aguardando pagamento;
- retirada mostra o endereço.

## Atenção ao token do Bling

O access token expira e o refresh token também tem prazo. Se o refresh token expirar/revogar, será necessário refazer a autorização do aplicativo Bling e atualizar `BLING_REFRESH_TOKEN` no Netlify.

## 8. Verificação rápida depois do deploy

Abra `https://relppscosmeticoss.netlify.app/api/health`.

O retorno deve mostrar `ok: true`. Se aparecer `503`, o próprio JSON indica qual configuração está faltando. O campo de frete pode ficar `false` se o Melhor Envio ainda não tiver sido configurado; isso não impede retirada presencial.

## 9. Homologação automática do Bling

O projeto inclui `homologacao-bling.html` e a Function `bling-homologacao.js`.

1. No Netlify, crie `HOMOLOGATION_SECRET` com um segredo forte escolhido por você.
2. Faça um novo deploy.
3. Abra `https://relppscosmeticoss.netlify.app/homologacao-bling.html`.
4. Informe o mesmo segredo e clique em **Executar homologação**.
5. A função executa automaticamente GET → POST → PUT → PATCH → DELETE na API de homologação, encadeando o `x-bling-homologacao` e renovando o token se necessário.
6. O teste é rejeitado se ultrapassar 10 segundos.

O segredo nunca é salvo no navegador. A página apenas o envia no header da requisição e a Function valida no servidor.

Depois de um resultado `ok: true`, volte à tela **Homologação** do aplicativo no Bling e continue o processo de revisão/solicitação de revisão.
