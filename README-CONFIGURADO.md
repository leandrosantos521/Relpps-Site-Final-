# Relpps Cosméticos — Supabase configurado

Esta versão já está configurada para o projeto Supabase informado pelo proprietário.

- Cadastro/login: Supabase Auth
- Dados básicos: perfil na nuvem
- Endereço: tabela `addresses` ou compatibilidade com a tabela `endereços`
- Bling: DESATIVADO nesta etapa

## Teste local

Abra o `index.html` por um servidor local (não pelo `file://`), pois o Auth do Supabase e alguns recursos do navegador funcionam melhor em HTTP.

Uma forma simples, se você tiver Python instalado:

```bash
python -m http.server 5500
```

Depois acesse `http://localhost:5500`.

## Atenção ao e-mail

Se o Supabase exigir confirmação de e-mail, o cliente precisa confirmar o endereço antes de conseguir entrar.

## Segurança

A chave incluída é uma Publishable key, destinada ao uso no navegador. Não coloque `service_role` ou `secret` no frontend.

## Próxima etapa

Depois de validar cadastro/login/endereço, conectar GitHub → Netlify e só então ativar a integração segura com o Bling por Netlify Functions.
