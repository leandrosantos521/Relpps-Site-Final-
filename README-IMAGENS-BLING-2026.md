# Relpps — correção definitiva das imagens do Bling

Esta versão corrige o catálogo para não confundir `linkExterno`/URL da página do produto com a foto.

Também:
- lê as estruturas de mídia do produto, incluindo `midia.imagens.externas[].link`;
- aceita variações de nomes de campos de imagem;
- tenta as fotos seguintes quando uma URL falha;
- força HTTPS quando a URL do Bling vier em HTTP;
- reconsulta o detalhe do produto quando a listagem não traz uma foto válida;
- ignora cache antigo que contenha URL de página de produto;
- remove a rotina de sondagem de até 8 URLs por imagem, que deixava a vitrine lenta.

## Deploy

Substitua o projeto pelo conteúdo deste ZIP no Netlify e publique uma nova versão.

Não inclua `.env` ou `.bling-tokens.json` no repositório/ZIP. Configure as variáveis secretas no Netlify.

## Bling

Para as imagens virem do Bling, o aplicativo OAuth precisa ter acesso ao catálogo de produtos. Depois de alterar escopos no aplicativo do Bling, autorize novamente a integração.

Domínio de produção:
https://relppscosmeticoss.netlify.app/
