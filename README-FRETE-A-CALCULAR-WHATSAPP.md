# Frete a calcular + WhatsApp — Relpps

- O checkout não chama Uber Direct nem Melhor Envio para cobrar frete.
- Melhor Envio e Uber aparecem como opções com **A calcular**.
- O CEP e endereço continuam sendo registrados no pedido.
- O pedido é criado no Bling antes do pagamento, com frete R$ 0,00 e observação **A CALCULAR NO MELHOR ENVIO**.
- InfinitePay cobra apenas produtos menos descontos neste fluxo.
- Depois do pagamento aprovado, `pedido.html` mostra WhatsApp com mensagem pronta contendo pedido, total, itens, CEP/endereço e aviso de frete a calcular.
- O cliente ainda precisa tocar em **ENVIAR** no WhatsApp. Para envio 100% automático sem ação do cliente, seria necessário WhatsApp Cloud API.
