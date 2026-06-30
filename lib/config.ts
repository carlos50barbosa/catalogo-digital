/**
 * Configuração central da aplicação, lida de variáveis de ambiente com
 * defaults sensatos para que o build e o dev funcionem sem nada configurado.
 * Valores sensíveis (DATABASE_URL, NEXTAUTH_SECRET) NÃO têm default real.
 *
 * Obs.: evitamos chamar process.cwd()/path.resolve no escopo do módulo para
 * não inflar o trace do build standalone. Caminhos relativos em UPLOAD_DIR são
 * resolvidos em runtime (relativos ao diretório de execução do servidor).
 */
export const config = {
  /** URL pública da app (links da loja, metadata, Open Graph). */
  appUrl: process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000',

  /** Diretório onde os uploads são gravados (fora de /public). Pode ser absoluto. */
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',

  /** Prefixo da URL pública dos uploads (Nginx em prod, /api/uploads em dev). */
  uploadPublicPath: '/uploads',

  /** Tamanho máximo de upload em bytes. */
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB ?? '5') || 5) * 1024 * 1024,

  /** Cor de destaque padrão quando a loja não define accentColor. */
  defaultAccentColor: '#16a34a',

  /** WhatsApp de vendas (para CTAs de upgrade/regularização no painel). */
  salesWhatsapp: process.env.SALES_WHATSAPP ?? '5582999999999',

  /** Taxa única de montagem (referência exibível). */
  setupFee: Number(process.env.SETUP_FEE ?? '250') || 250,

  /** Fluxo self-service. */
  signup: {
    /** PAY_TO_ACTIVATE: loja só publica após 1º pagamento. TRIAL: período de teste. */
    mode: (process.env.SIGNUP_MODE ?? 'PAY_TO_ACTIVATE') as 'PAY_TO_ACTIVATE' | 'TRIAL',
    trialDays: Number(process.env.TRIAL_DAYS ?? '7') || 7,
    /** mínimo de produtos para publicar a loja no onboarding. */
    minProductsToPublish: Number(process.env.MIN_PRODUCTS_TO_PUBLISH ?? '5') || 5,
  },

  /** E-mail transacional (verificação, boas-vindas). Sem host => loga no console (dev). */
  email: {
    host: process.env.EMAIL_HOST ?? '',
    port: Number(process.env.EMAIL_PORT ?? '587') || 587,
    user: process.env.EMAIL_USER ?? '',
    pass: process.env.EMAIL_PASS ?? '',
    secure: process.env.EMAIL_SECURE === 'true',
    from: process.env.EMAIL_FROM ?? 'Catálogo Digital <nao-responda@cataloggo.app.br>',
  },

  /** Asaas (Parte B). Chaves só via env. */
  asaas: {
    // A chave do Asaas começa com '$' (ex.: $aact_...). No .env ela é escrita
    // escapada como "\$aact_..." por causa do `next dev`/`next start`: o
    // @next/env roda dotenv-expand e, sem a barra, trataria "$aact_..." como
    // expansão de variável inexistente → string vazia. Em produção o PM2 usa
    // `node --env-file`, que NÃO interpreta o escape e mantém a barra; por isso
    // removemos aqui um "\$" inicial. Sobre valor cru ("$aact_...") é no-op.
    apiKey: (process.env.ASAAS_API_KEY ?? '').replace(/^\\\$/, '$'),
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN ?? '',
    env: (process.env.ASAAS_ENV ?? 'sandbox') as 'sandbox' | 'production',
    baseUrl:
      process.env.ASAAS_BASE_URL ??
      (process.env.ASAAS_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3'),
  },
} as const
