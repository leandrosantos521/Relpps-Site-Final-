RELPPS – CHECKOUT EM 3 ETAPAS (FRONT-END VISUAL)

Implementado nesta versão:
1. Dados do cliente -> botão CONTINUAR.
2. Recebimento -> Entrega (Correios/Uber) ou Retirada (Presencial/Uber por conta do cliente).
   - Entrega: CEP, endereço e cotação aparecem na mesma etapa.
   - Retirada: CEP e endereço ficam ocultos.
   - Há botão para voltar aos dados.
3. Pagamento -> Pix, Cartão e Dinheiro somente para retirada presencial.
   - Pix: prévia visual de QR Code.
   - Cartão: formulário visual de dados do cartão.
   - Dinheiro: mensagem de pagamento na retirada.
   - Há botão para voltar ao recebimento.

IMPORTANTE:
Esta versão mantém o checkout apenas no FRONT-END VISUAL para a etapa de pagamento.
O botão final não processa pagamento real nesta versão. A próxima etapa será conectar:
- Provedor de Pix/cartão;
- Confirmação automática de pagamento;
- Atualização do pedido como pago no Bling;
- Mensagem automática e direcionamento ao WhatsApp;
- Regras de liberação para entrega ou retirada.
