# RELPPS — Bling com imagens, marca e descrição

Esta versão preserva o visual do ZIP aprovado e altera apenas a sincronização do catálogo.

Ao carregar `/api/bling?action=products`, o servidor:
1. lista os produtos do Bling;
2. busca os detalhes de cada produto (em pequenos grupos para não sobrecarregar a API);
3. une os dados de listagem e detalhes;
4. envia ao site marca, descrição, preço, estoque e imagens disponíveis;
5. salva um cache local para o catálogo não ficar vazio em uma falha temporária.

No front-end, são reconhecidas imagens em campos como `imagem`, `imagemUrl`, `urlImagem`, `imagemPrincipal`, `imagens`, `fotos`, `anexos`, `midias` e `images` quando retornados pelo Bling.

## Importante
- As imagens precisam estar vinculadas ao produto no Bling para serem puxadas automaticamente.
- Este ZIP não inclui `.env`, `.bling-tokens.json`, cache ou estado OAuth, para não expor credenciais.
- Ao atualizar, mantenha/copiar os seus arquivos `.env` e `.bling-tokens.json` da pasta que já conecta ao Bling.
- Depois disso, use o mesmo `INICIAR-BLING-LOCAL.bat` que você já usava.
