# Relpps — Correios PAC, SEDEX, Mini Envios e retirada em dinheiro

Atualização aplicada ao checkout:

- O Melhor Envio agora consulta a lista de serviços disponíveis na conta e identifica dinamicamente os serviços dos Correios.
- O checkout mostra **PAC**, **SEDEX** e **Mini Envios** quando o serviço estiver habilitado na conta e disponível para o CEP/pedido.
- A integração não depende de um ID fixo para o Mini Envios. A API do Melhor Envio recomenda consultar os serviços disponíveis porque IDs podem mudar.
- Apenas serviços dos **Correios** são apresentados nessa área.
- A cotação continua usando `custom_price` e `custom_delivery_time` quando retornados pelo Melhor Envio.
- O botão de continuar para pagamento agora informa claramente quando falta selecionar uma cotação válida.
- Para **Retirada presencial + Dinheiro**, depois de criar o pedido o cliente é levado diretamente para `retirada.html?order=...&cash=1`.
- Essa página mostra de forma destacada que o pagamento é feito na loja, o endereço completo, a foto da loja, o número do pedido e um botão para abrir a localização no Google Maps.

## Importante

O Mini Envios só aparece se o Melhor Envio devolver uma cotação válida para aquele CEP, pacote e configuração da conta. A loja não inventa preço ou prazo.

## Variáveis principais

- `MELHOR_ENVIO_CLIENT_ID`
- `MELHOR_ENVIO_CLIENT_SECRET`
- `MELHOR_ENVIO_CALLBACK_URL=https://relppscosmetic.netlify.app/melhor-envio-callback.html`
- `MELHOR_ENVIO_TOKEN` (se usado; a conexão OAuth também pode armazenar o token no Supabase)
- `STORE_POSTAL_CODE=72010901`
- `INFINITEPAY_HANDLE=rps210323`
- `BLING_CREATE_ORDERS=true`
- `CHECKOUT_TEST_MODE=false`

## Testes realizados nesta versão

- Sintaxe de todos os arquivos JavaScript: aprovada com `node --check`.
- Cotação simulada do Melhor Envio: confirmou que a lista dinâmica pode retornar PAC + SEDEX + Mini Envios e que os três IDs são enviados à cotação.
- Pacote ZIP validado com `unzip -t`.
