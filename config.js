window.RELPPS_CONFIG = {
  // Troque pelo número comercial da loja, somente números com DDI + DDD.
  WHATSAPP_NUMBER: "5561996498557",

  // Supabase: cole aqui a URL do projeto e a chave PUBLICÁVEL (publishable).
  // NUNCA coloque a secret/service_role key no navegador.
  SUPABASE_ENABLED: true,
  SUPABASE_URL: "https://wsoetvctzybsdtsuydca.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_koJ49B6l5Ffvs5x70kaY_w_1QtTgikR",

  // Depois de publicar no Netlify, a vitrine chama /.netlify/functions/bling.
  // Se a API estiver desligada, a loja usa os produtos de demonstração.
  BLING_API_ENABLED: true,

  // Regras comerciais
  DISCOUNT_MIN_SUBTOTAL: 100,
  GENERAL_DISCOUNT: 0.05,
  GLUE_DISCOUNT: 0.03,
  DELIVERY_MIN_SUBTOTAL: 50,

  // Defina o valor real da entrega quando decidir a tabela de frete.
  DELIVERY_FEE: 0,

  // Onde o cliente pode retirar presencialmente.
  PICKUP_LABEL: "Retirada presencial — endereço informado pela loja",

  // Chaves de categoria usadas para reconhecer colas.
  GLUE_KEYWORDS: ["cola", "colas"]
};

// Checkout e frete: mantenha true enquanto estiver testando sem credenciais reais.
window.RELPPS_CONFIG.CHECKOUT_TEST_MODE = false;
window.RELPPS_CONFIG.SHIPPING_TEST_MODE = false;
