# Bling local — Relpps

## 1. Criar o .env

Copie `.env.example` para `.env` e preencha somente:

```env
BLING_CLIENT_ID=429de6780ac98269da2611994c7740a32d958045
BLING_CLIENT_SECRET=SEU_CLIENT_SECRET
BLING_REDIRECT_URI=http://127.0.0.1:5500/bling-callback.html
BLING_CREATE_ORDERS=false
PORT=5500
HOST=127.0.0.1
```

O `BLING_CLIENT_SECRET` não deve ser colocado no HTML ou no JavaScript do navegador.

## 2. Iniciar

É necessário Node.js 20+.

```bash
node server.js
```

Abra:

```text
http://127.0.0.1:5500/bling-connect.html
```

Clique em **CONECTAR AO BLING** e autorize o aplicativo.

## 3. Depois da autorização

A loja passa a consultar:

```text
/api/bling?action=products
/api/bling?action=product&id=...
/api/bling?action=stock&id=...
```

Os tokens ficam no arquivo local `.bling-tokens.json`, que está no `.gitignore`.

A criação de pedidos continua desativada até validarmos o payload do seu Bling:

```env
BLING_CREATE_ORDERS=false
```
