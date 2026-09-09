CLUBE RELPPS+
==============

Implementado neste ZIP:
- Entrada automática no Clube Relpps+ ao criar a conta.
- 50 pontos de boas-vindas para novos membros.
- "Clube Relpps+" em dourado abaixo de "Olá, Nome" quando o cliente está logado.
- Dashboard premium dentro da conta com saldo, nível e progresso.
- Níveis: Essencial, Gold (500 pontos) e Luxe (1.500 pontos).
- Recompensas: 100 pts = R$ 5 OFF; 200 = R$ 12 OFF; 500 = R$ 35 OFF; 1.000 = R$ 80 OFF.
- Geração de cupom exclusivo ao resgatar uma recompensa.
- Seção premium na página inicial explicando o programa.
- Newsletter com validação e toast.
- Fallback local para demonstração sem Supabase.
- SQL preparado para persistir pontos e cupons no Supabase.

IMPORTANTE:
Os pontos por compras devem ser creditados somente depois que a próxima etapa do projeto
integrar o provedor de pagamento e confirmar o pedido como pago. Isso evita dar pontos
por pagamentos pendentes ou cancelados.

ATUALIZAÇÃO 03/09/2026
- Club Relpps reorganizado para mobile, sem textos quebrando letra por letra.
- Pontos e cupons permanecem no navegador e, com Supabase configurado, são sincronizados na nuvem.
- Cupons resgatados geram desconto real no checkout e são enviados no payload do pedido.
- Regra automática: subtotal a partir de R$ 100, Pix ou dinheiro, 5% geral e 3% para itens identificados como cola.
- O pedido enviado ao Bling recebe o desconto total e o detalhamento da regra nas observações.
- Catálogo passa a priorizar URLs de imagem original/alta resolução em vez de thumbnails.
