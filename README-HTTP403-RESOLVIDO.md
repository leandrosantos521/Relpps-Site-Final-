# Correção do bloqueio de autorização do Bling

Esta versão não deixa o site preso reutilizando um token antigo quando o aplicativo Bling teve os escopos alterados.

## O que mudou

- O cliente Bling usa a API atual `https://api.bling.com.br/Api/v3`.
- OAuth e refresh usam `enable-jwt: 1`, conforme a documentação atual do Bling.
- Se a API responder 403 por falta de escopo, o token OAuth salvo no Supabase é limpo (quando não há `BLING_ACCESS_TOKEN` fixo).
- O backend devolve um código controlado `BLING_REAUTHORIZE_REQUIRED` em vez de expor HTTP 403 ao checkout.
- O checkout detecta esse código e abre automaticamente `/api/bling?action=repair`, que limpa a autorização antiga e inicia novamente o OAuth.
- A consulta de formas de pagamento do Bling deixou de bloquear a criação do pedido: a cobrança é feita pela InfinitePay, então a forma de pagamento do Bling é apenas informativa.
- O fluxo continua exigindo os escopos de recurso realmente usados: `order`, `product`, `contact` e `stock`.

## IMPORTANTE — passo único após atualizar o ZIP

Como você acabou de alterar os escopos do aplicativo no Bling, é necessário autorizar novamente uma vez.

Abra:

`https://relppscosmetico.netlify.app/api/bling?action=repair`

Autorize o aplicativo e volte para a loja.

O Bling informa que alterações na lista de escopos revogam as autorizações existentes; por isso, salvar os escopos não atualiza o token antigo. A nova autorização é obrigatória.
