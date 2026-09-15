# Melhor Envio — autorização OAuth

1. No Netlify, configure `MELHOR_ENVIO_CLIENT_ID` e `MELHOR_ENVIO_CLIENT_SECRET`.
2. Configure `MELHOR_ENVIO_CALLBACK_URL` exatamente como: `https://relppscosmeticoss.netlify.app/melhor-envio-callback.html`.
3. Execute o SQL que cria `relpps_melhor_envio_oauth` no Supabase.
4. Abra `https://relppscosmeticoss.netlify.app/api/shipping?action=authorize`.
5. Autorize a conta do Melhor Envio.
6. O callback salva access/refresh token no Supabase. O access token é renovado automaticamente.

Scopes usados: `shipping-calculate ecommerce-shipping`.
