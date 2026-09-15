RELPPS — FRETE FINAL

1) MELHOR ENVIO
- O cliente informa o CEP no checkout.
- O site consulta a API real do Melhor Envio.
- O checkout mostra as opções reais, preço e prazo.
- O cliente escolhe uma opção.
- A cotação assinada fica vinculada ao pedido.
- InfinitePay cobra PRODUTOS + FRETE em uma única cobrança.
- O pedido é criado no Bling com o frete escolhido.

2) UBER ENTREGAS
- No checkout aparece: Uber Entregas — A calcular.
- O cliente NÃO paga nessa etapa.
- O pedido é criado no Bling com frete 0/A calcular.
- O cliente recebe a página do pedido e aguarda.
- O administrador calcula/negocia a entrega Uber e coloca o valor do frete no campo de frete do pedido no BLING.
- Em /liberar-pedido.html, informe o número do pedido e o segredo administrativo e clique em:
  ATUALIZAR FRETE DO BLING / LIBERAR PAGAMENTO
- O sistema lê transporte.frete do Bling, soma ao valor dos produtos/descontos e cria uma cobrança InfinitePay do TOTAL COMPLETO.
- O link aparece automaticamente na página pedido.html do cliente.
- Após o pagamento confirmado pelo webhook InfinitePay, o pedido fica CONFIRMADO e aparece o botão WHATSAPP — CONFIRMAR PEDIDO.

IMPORTANTE
- O Client Secret/segredos ficam somente no backend/Netlify.
- Não envie segredos pelo chat.
- Para Melhor Envio em produção, configure MELHOR_ENVIO_TOKEN, STORE_POSTAL_CODE, SHIPPING_QUOTE_SECRET e CHECKOUT_TEST_MODE=false.
- Para InfinitePay, configure INFINITEPAY_HANDLE=rps210323 e CHECKOUT_TEST_MODE=false.
- Para sincronizar Uber a partir do Bling, configure RELPPS_ADMIN_RELEASE_SECRET.
