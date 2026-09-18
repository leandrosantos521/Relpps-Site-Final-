RELPPS — BLING / PEDIDO DE VENDA — CONFIGURAÇÃO FINAL

DOMÍNIO
https://relppscosmetic.netlify.app

O checkout cria o Pedido de Venda diretamente no Bling pela API v3, em:
Vendas > Pedidos de Venda

CALLBACK OAUTH DO BLING
https://relppscosmetic.netlify.app/bling-callback.html

AUTORIZAÇÃO DIRETA
https://relppscosmetic.netlify.app/api/bling?action=authorize

WEBHOOK DO BLING — PEDIDO DE VENDA
https://relppscosmetic.netlify.app/api/bling-webhook

No aplicativo do Bling, habilite o recurso/escopo de webhook:
Pedido de Venda (order)

Evento usado pelo site:
order.updated

O webhook valida o header X-Bling-Signature-256 usando o BLING_CLIENT_SECRET.

NETLIFY — VARIÁVEIS OBRIGATÓRIAS PARA CRIAR PEDIDO
PUBLIC_SITE_URL=https://relppscosmetic.netlify.app
BLING_CREATE_ORDERS=true
BLING_CLIENT_ID=<Client ID do aplicativo Bling>
BLING_CLIENT_SECRET=<Client Secret do aplicativo Bling>
SUPABASE_URL=<URL do Supabase>
SUPABASE_SERVICE_ROLE_KEY=<Service Role Key do Supabase>

Se o OAuth já estiver salvo no Supabase, BLING_REFRESH_TOKEN não é obrigatório.

IMPORTANTE
- Não coloque Client Secret no navegador.
- Não publique .env com segredos.
- O site valida estoque e preço dos produtos diretamente no Bling antes de criar o pedido.
- O checkout usa numeroLoja para idempotência: se o mesmo pedido for reenviado, o sistema procura o Pedido de Venda já criado em vez de duplicá-lo.
- Depois do POST, o sistema confirma o pedido com GET /pedidos/vendas/{id}.
- Em falhas de rede/429/5xx, o sistema tenta novamente e depois procura o pedido pelo numeroLoja para evitar duplicidade.
- O cadastro do cliente tenta CPF, depois e-mail, e possui uma segunda tentativa de payload limpo para reduzir falhas de validação.

TESTE OBRIGATÓRIO
1. Publique a RAIZ deste ZIP no Netlify.
2. Faça novo deploy após alterar variáveis de ambiente.
3. Abra /api/health e confirme que o Bling está configurado.
4. Autorize o aplicativo pelo /api/bling?action=authorize.
5. Faça uma compra de teste.
6. Só considere o teste aprovado quando o pedido aparecer em:
   Bling > Vendas > Pedidos de Venda

WEBHOOK NÃO SUBSTITUI A CRIAÇÃO DO PEDIDO.
O Pedido de Venda é criado pelo checkout via POST /pedidos/vendas. O webhook serve para receber atualizações do Bling depois da criação.
