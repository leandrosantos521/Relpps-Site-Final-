# Relpps Cosméticos — Cadastro na nuvem com Supabase

Esta versão deixa o login/cadastro pronto para funcionar na nuvem **antes da publicação**. O site usa Supabase Auth para e-mail/senha e uma tabela `profiles` para guardar nome, CPF, telefone e endereço.

## 1. Criar o projeto Supabase

1. Entre no Supabase e crie um projeto.
2. Abra o **SQL Editor**.
3. Cole e execute todo o conteúdo de `supabase-schema.sql`.
4. Em **Project Settings → API**, copie:
   - Project URL
   - Publishable key (ou a chave anon, se o painel ainda mostrar o nome antigo)
5. Abra `config.js` e preencha:

```js
SUPABASE_ENABLED: true,
SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
SUPABASE_PUBLISHABLE_KEY: "SUA_CHAVE_PUBLICAVEL"
```

**Nunca coloque a Secret key / service_role no navegador.**

## 2. Confirmação de e-mail

Em projetos hospedados, a confirmação de e-mail pode estar ativada. Nesse caso, depois do cadastro o cliente recebe um e-mail e precisa confirmar antes de entrar. Isso é normal e recomendado.

Se quiser testar sem confirmação durante o desenvolvimento, altere temporariamente a configuração de confirmação de e-mail no painel de Auth do Supabase.

## 3. O que fica salvo

Na tabela `profiles`:
- nome
- CPF
- e-mail
- WhatsApp
- CEP
- endereço
- número
- complemento
- bairro
- cidade/UF

A senha **não** é salva nessa tabela. Ela fica sob responsabilidade do Supabase Auth.

As políticas RLS incluídas em `supabase-schema.sql` fazem com que cada cliente só consiga consultar/alterar o próprio perfil.

## 4. Testar antes de publicar

Depois de preencher `config.js`, abra o `index.html` por um servidor local (não por `file://` se o navegador bloquear recursos). Um jeito simples é usar a extensão Live Server no VS Code.

Faça um cadastro de teste, confirme o e-mail se estiver habilitado, saia e faça login novamente. O endereço deve reaparecer no checkout.

## 5. Bling

O Bling continua desligado nesta versão. Depois de validar o cadastro na nuvem, podemos conectar:

- produtos reais;
- fotos;
- preço;
- estoque;
- variações;
- criação de pedido;
- sincronização de estoque.

As credenciais do Bling deverão ficar somente nas variáveis de ambiente da Netlify, nunca no JavaScript público.
