# Relpps + Bling — teste local sem Node

Esta versão permite testar o OAuth e a API do Bling localmente usando **PowerShell do Windows**, sem instalar Node.js.

## 1) Crie `.env`

Na mesma pasta do `bling-local.ps1`, crie `.env`:

```env
BLING_CLIENT_ID=SEU_CLIENT_ID
BLING_CLIENT_SECRET=SEU_CLIENT_SECRET
BLING_REDIRECT_URI=http://127.0.0.1:5500/bling-callback.html
```

Não coloque o Client Secret no HTML/JS e não envie o segredo para ninguém.

## 2) Feche o Live Server

Como o Bling está configurado para `127.0.0.1:5500`, o Live Server precisa estar fechado para liberar a porta 5500.

## 3) Inicie

Dê dois cliques em `INICIAR-BLING-LOCAL.bat`.

Se o Windows mostrar uma confirmação do PowerShell, permita.

## 4) Abra

`http://127.0.0.1:5500/bling-connect.html`

Clique em **CONECTAR AO BLING**, autorize e o Bling retornará para `bling-callback.html`.

## 5) Testar produtos

Depois de conectado, a API local fica disponível em `/api/bling?action=products`.

Os tokens ficam no arquivo local `.bling-tokens.json`.
