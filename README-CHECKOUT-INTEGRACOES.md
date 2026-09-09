# Checkout Relpps — estrutura de integração

## O que já está estruturado

- CEP com consulta automática pelo ViaCEP.
- Área de cotação de frete.
- Melhor Envio para cotações nacionais.
- Uber Moto/Uber Direct como opção de entrega local.
- Dados completos do cliente.
- Criação de pedido com status inicial **Aguardando pagamento**.
- Integração com o fluxo já existente do Bling.
- Botões e mensagens de WhatsApp.
- Netlify Functions para que tokens e secrets não fiquem no navegador.
- Modo de teste ativo por padrão.

## Modo de teste

Com `CHECKOUT_TEST_MODE=true`, o checkout usa cotações simuladas e permite simular um pagamento aprovado. Nenhuma cobrança real é feita.

Após a simulação:

- Entrega: `Pagamento aprovado` → `Liberado para preparação e entrega`.
- Retirada: `Pagamento aprovado` → `Liberado para preparação e retirada`.

## Melhor Envio

Quando o teste terminar:

1. Crie/autorize o aplicativo no ambiente Sandbox.
2. Configure `MELHOR_ENVIO_TOKEN` e `STORE_POSTAL_CODE` nas variáveis do Netlify.
3. Teste a cotação.
4. Só depois mude `CHECKOUT_TEST_MODE=false` e configure as credenciais de produção.

## Uber Direct

A Uber exige credenciais OAuth e, dependendo do acesso da conta/região, aprovação para usar as APIs. Antes de ativar a criação real de entregas, configure o ponto de retirada da loja e as credenciais nas variáveis do Netlify.

## Pagamento real e liberação automática

A interface já está preparada para o fluxo, mas para cobrar de verdade ainda é necessário escolher um provedor de pagamento (por exemplo, Mercado Pago, Asaas ou outro). O fluxo de produção deve ser:

1. Criar pedido no Bling/checkout como `Aguardando pagamento`.
2. Redirecionar/mostrar o Pix/link do provedor.
3. O provedor chama um webhook autenticado após `approved`.
4. A Function valida a assinatura do webhook.
5. Atualiza o pedido para `Pagamento aprovado`.
6. Entrega: cria/libera a logística.
7. Retirada: marca para preparação/retirada.

Nunca coloque tokens, client secrets ou chaves privadas no `config.js`.

## Correção da cotação de teste
A cotação do checkout agora possui um fallback local automático no modo de teste. Se `/api/shipping` não estiver disponível (por exemplo, ao abrir a loja por um servidor estático), o botão **Calcular frete** ainda calcula e mostra as opções simuladas de Melhor Envio e Uber Moto. Em produção, com `CHECKOUT_TEST_MODE=false`, o sistema usa apenas as APIs configuradas.
