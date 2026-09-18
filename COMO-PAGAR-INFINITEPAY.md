RELPPS — PAGAMENTO INFINITEPAY

1. No Netlify: INFINITEPAY_HANDLE=rps210323
2. CHECKOUT_TEST_MODE=false
3. PUBLIC_SITE_URL=https://relppscosmetico.netlify.app
4. Para criar o pedido no Bling, configure BLING_CLIENT_ID e BLING_CLIENT_SECRET e conecte o Bling em:
   https://relppscosmetico.netlify.app/api/bling?action=authorize
5. Depois de conectar, o cliente escolhe Pix ou Cartão e é redirecionado para o checkout oficial da InfinitePay.
6. A Relpps não coleta número de cartão, validade ou CVV.

Se o Bling não estiver conectado, o checkout agora abre automaticamente a conexão do Bling em vez de mostrar o erro bruto de BLING_REFRESH_TOKEN.
