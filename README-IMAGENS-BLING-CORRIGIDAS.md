# RELPPS — imagens do Bling corrigidas

Esta versão corrige o carregamento das imagens do catálogo.

- Reconhece `imagemURL`, `imagemUrl`, `imagemurl`, `imageURL`, `imageUrl`, `urlImagem`, `imagemPrincipal`, `midia`, `linkMiniatura` e outros campos de mídia do Bling.
- Não confunde `linkExterno`/links de produto com imagem.
- Converte URLs HTTP de imagens para HTTPS.
- Imagens do Bling podem ser entregues pela Function `/api/bling?action=image` com cache do navegador/CDN.
- Mantém tentativa direta da URL original se o proxy de imagem falhar.
- Remove a rotina antiga que fazia várias sondagens de cada foto e deixava a loja lenta.
- Mantém o carregamento por página para não disparar centenas de chamadas ao Bling de uma vez.

IMPORTANTE: este pacote não contém `.env`, `.bling-tokens.json` nem qualquer token/segredo. Configure os segredos somente nas variáveis de ambiente do Netlify.
