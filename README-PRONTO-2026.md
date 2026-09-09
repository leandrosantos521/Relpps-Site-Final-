# Relpps Cosméticos — pacote pronto

## O que foi ajustado
- Catálogo completo baseado nos dois CSVs enviados do Bling, com cache local para a loja não ficar limitada aos produtos de demonstração.
- Produtos do Bling ao vivo substituem automaticamente o cache quando a integração estiver disponível.
- Imagens do Bling têm prioridade quando o cadastro fornece foto.
- Criada uma rotina de carregamento de imagens por página: ao abrir o catálogo, o site busca as fotos reais dos produtos no Bling e grava um cache no navegador.
- As 70 fotos locais existentes no pacote continuam como fallback inteligente quando o Bling não possui imagem.
- Fallback visual por área para evitar mostrar uma foto de gel em equipamentos/cílios/sobrancelhas.
- Melhorias de cabeçalho, logo, busca, cartões de produto, sombras, espaçamento e acabamento visual.
- Ajustes adicionais para PC e celular, incluindo catálogo em 2 colunas no celular, menu lateral e prevenção de sobreposição no topo.
- Removidas credenciais e tokens do Bling do pacote distribuível. Eles não devem ficar dentro do ZIP publicado.

## Para publicar no Netlify
Configure as variáveis de ambiente no painel do Netlify:
- BLING_CLIENT_ID
- BLING_CLIENT_SECRET
- BLING_REFRESH_TOKEN (ou o fluxo OAuth usado pela sua conta)
- BLING_CREATE_ORDERS=false durante os testes
- BLING_SITUACAO_AGUARDANDO_PAGAMENTO_ID (opcional)

O arquivo `config.js` mantém a integração do Bling ativada.

## Importante sobre imagens
A correspondência mais confiável é a foto cadastrada no próprio produto do Bling. Por isso, quando o Bling entrega uma imagem, ela é usada antes das fotos locais. Se um produto não tiver foto no Bling, o site usa o melhor fallback local disponível.

## Checkout
O checkout permanece em modo de teste porque não existe um provedor de pagamento real configurado neste pacote. Antes de receber pagamentos reais, configure o provedor e o webhook autenticado.
