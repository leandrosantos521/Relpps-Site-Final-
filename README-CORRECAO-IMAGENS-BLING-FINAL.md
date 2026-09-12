# Correção definitiva das imagens do Bling

A loja agora:

- lê `imagemUrl/imagemurl/imagemURL` quando o Bling devolver a imagem na listagem;
- busca o detalhe do produto para recuperar imagens internas/externas quando a listagem não trouxer a foto;
- passa imagens hospedadas no Bling por `/.netlify/functions/bling?action=image-proxy` para evitar bloqueios de navegador/hotlink;
- mantém cache das imagens no navegador;
- tenta as imagens de até 24 produtos por página sem ultrapassar o limite global do Bling.

## Importante

As variáveis `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` e `BLING_REFRESH_TOKEN` devem estar configuradas no Netlify. O arquivo `.env` não deve ser publicado.

Domínio de produção configurado: `https://relppscosmeticoss.netlify.app`
