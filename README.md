# Relpps Cosméticos — loja profissional

Projeto estático pronto para Netlify, com HTML + CSS + JavaScript e uma Function serverless para integração com o Bling.

## O que já está pronto

- Layout inspirado em e-commerce premium, usando a logo enviada.
- Hero/banner elegante e áreas de categorias, produtos e marcas.
- Produtos de demonstração com imagens locais em SVG.
- Busca e filtros por categoria.
- Página/modal de venda com variações de cor, tamanho, velocidade, acabamento etc.
- Preço muda automaticamente conforme a variação.
- Carrinho flutuante + gaveta lateral.
- Regra automática: a partir de R$ 100:
  - 5% de desconto em produtos gerais;
  - 3% de desconto em colas.
- Checkout com:
  - nome, CPF, e-mail e WhatsApp;
  - entrega (mínimo de R$ 50);
  - retirada via Uber por conta do cliente;
  - retirada presencial;
  - CEP + preenchimento de endereço via ViaCEP;
  - pagamento condicionado à modalidade;
  - dinheiro somente na retirada presencial.
- WhatsApp configurável.
- Netlify Function pronta como proxy seguro do Bling.
- Leitura paginada de produtos do Bling.
- Endpoint para consultar produto e saldo.
- Estrutura preparada para enviar pedido ao Bling após mapear o payload de Pedido de Venda da sua conta.

## 1) Publicar

Envie esta pasta para um repositório Git e conecte ao Netlify, ou faça upload do projeto pelo Netlify.

Não é necessário Node/npm para a parte visual.

## 2) Configurar WhatsApp

Abra `config.js` e altere:

`WHATSAPP_NUMBER: "5511999999999"`

Use somente números, com país + DDD + número.

## 3) Configurar Bling no Netlify

No painel do Netlify, em Environment Variables, configure:

- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REFRESH_TOKEN`

Alternativamente, para teste, pode usar `BLING_ACCESS_TOKEN`.

O segredo NÃO deve ficar no HTML/JavaScript do navegador.

A API atual do Bling usa OAuth 2.0 e a base atual é `https://api.bling.com.br/Api/v3`. O projeto usa a Function serverless para não expor o client secret.

## 4) OAuth do Bling

Crie um aplicativo no Bling e configure a URL de redirecionamento no cadastro do aplicativo.

O fluxo é OAuth 2.0 Authorization Code. O `authorization_code` tem janela curta de utilização; depois dele você obtém o `access_token` e `refresh_token`.

Para produção, guarde o refresh token como variável de ambiente do Netlify.

## 5) Produtos e estoque

A página chama:

`/.netlify/functions/bling?action=products`

A Function consulta os produtos em páginas de até 100 registros e transforma a resposta no catálogo.

O JavaScript tenta reconhecer:
- nome/descrição;
- categoria;
- marca;
- preço;
- estoque físico/virtual;
- imagem.

Se o Bling estiver sem credenciais ou indisponível, o site continua funcionando com o catálogo de demonstração.

## 6) Pedidos

O checkout já monta um pedido normalizado.

Por segurança, a criação definitiva do Pedido de Venda no Bling fica desligada por padrão.

Quando você quiser ativar:

`BLING_CREATE_ORDERS=true`

Antes disso, ajuste `netlify/functions/bling.js` para o schema exato do Pedido de Venda que sua conta usa, principalmente contato, itens, forma de pagamento, transporte e operação.

## 7) Webhooks de estoque

Para deixar o estoque praticamente em tempo real, recomendo ativar no Bling o webhook de `stock` e/ou `virtual_stock` apontando para uma Function dedicada.

O projeto já deixa a leitura via API pronta; o webhook pode ser acrescentado depois sem mudar o layout.

## 8) Regras comerciais

Tudo fica em `config.js`:

- `DISCOUNT_MIN_SUBTOTAL`: 100
- `GENERAL_DISCOUNT`: 0.05
- `GLUE_DISCOUNT`: 0.03
- `DELIVERY_MIN_SUBTOTAL`: 50
- `DELIVERY_FEE`: 0

Altere `DELIVERY_FEE` quando definir a tabela de entrega.

## 9) Próximos ajustes recomendados

1. Inserir suas imagens reais em `assets/`.
2. Cadastrar o número oficial do WhatsApp.
3. Configurar Bling/OAuth no Netlify.
4. Definir valor/tabela do frete.
5. Definir endereço de retirada presencial.
6. Mapear o Pedido de Venda do Bling.
7. Depois, adicionar painel administrativo, banners gerenciáveis e login de clientes.

