# Correção do bloqueio do CPF no checkout

A causa do erro era o front-end procurar `#cpf`, `#email` e `#phone`, mas os campos do checkout possuem `name="cpf"`, `name="email"` e `name="phone"` sem esses IDs.

A validação agora lê os campos diretamente de `checkoutForm.elements`, normaliza o CPF e só então segue para o cadastro do contato e criação do Pedido de Venda no Bling.

Publicar a RAIZ deste ZIP no Netlify e fazer um novo deploy.
