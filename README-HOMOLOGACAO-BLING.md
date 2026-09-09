# Homologação Bling — Relpps

A automação segue o fluxo oficial de homologação do Bling:

1. GET `/Api/v3/homologacao/produtos`
2. POST `/Api/v3/homologacao/produtos` usando os dados retornados pelo GET
3. PUT `/Api/v3/homologacao/produtos/{id}` alterando `descricao` para `Copo`
4. PATCH `/Api/v3/homologacao/produtos/{id}/situacoes` com `{ "situacao": "I" }`
5. DELETE `/Api/v3/homologacao/produtos/{id}`

O `x-bling-homologacao` recebido em cada etapa é enviado na etapa seguinte. O fluxo também usa refresh token se o access token for invalidado.

## Configuração

No Netlify, adicione:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`
- `HOMOLOGATION_SECRET`

Não coloque nenhum desses valores no código ou no `config.js`.

## Execução

Abra:

`/homologacao-bling.html`

Digite o `HOMOLOGATION_SECRET` e clique em **Executar homologação**.

O resultado precisa mostrar `ok: true` e as cinco etapas concluídas. O Bling exige no máximo 10 segundos para o teste completo e no máximo 2 segundos entre requests.
