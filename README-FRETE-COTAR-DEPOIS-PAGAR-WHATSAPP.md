# Frete: calcular depois e cobrar antes de confirmar

Fluxo: cliente paga produtos na InfinitePay -> pedido é criado no Bling -> Relpps calcula Melhor Envio na área interna ou informa Uber manualmente -> sistema atualiza frete/total no Bling -> gera cobrança InfinitePay somente do frete -> cliente paga -> webhook confirma frete -> página do pedido libera WhatsApp para confirmação.

Área interna: `/liberar-pedido.html`

Variáveis: `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_SANDBOX=false`, `RELPPS_ADMIN_RELEASE_SECRET`, `INFINITEPAY_HANDLE=rps210323`, `BLING_*`, `SUPABASE_*`.

O Uber continua aparecendo no checkout como `A calcular`. O valor pode ser informado manualmente na área interna sem depender da API Uber Direct.
