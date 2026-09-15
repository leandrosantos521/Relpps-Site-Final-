RELPPS — AJUSTES FINAIS

1. Banner
- Banner Dia do Cliente permanece como primeiro banner.
- Carrossel automático a cada 8 segundos.
- A altura do carrossel acompanha a proporção da arte ativa para não cortar textos/produtos.
- Imagens usam contain + leve zoom/transição para manter toda a arte visível.

2. Cabeçalho
- Removida a linha preta/inset que aparecia acima da navegação.
- Mantida a faixa principal preta.
- Busca com cantos arredondados e acabamento premium.

3. Uber Entregas
- No Meu Carrinho, ao escolher Entrega, Uber Entregas aparece como opção própria.
- Uber fica “A calcular” até a Relpps lançar o valor no pedido.
- No checkout, removida a frase “Você não paga agora.”
- Texto exibido:
  “Após o pedido ser criado, a Relpps informa o valor da entrega no pedido.
   Quando o frete for lançado, o botão de pagamento aparecerá nesta página com o valor total.”
- O aviso ficou mais visível.

4. Bling HTTP 403
- Erros 403 agora são identificados por escopo (order/product/stock) e retornados com orientação de reconexão.
- A API continua usando JWT com enable-jwt: 1.
- Para criação de pedido, o aplicativo Bling precisa ter o escopo order e o usuário precisa autorizar novamente após alteração de escopos.
- Catálogo continua usando cache local quando o Bling fica indisponível.

IMPORTANTE — NETLIFY/Bling:
Se o aplicativo Bling teve escopos alterados, faça uma nova autorização em:
https://relppscosmeticoss.netlify.app/bling-connect.html

Callback do Bling:
https://relppscosmeticoss.netlify.app/bling-callback.html

Não coloque secrets no ZIP ou no frontend.
