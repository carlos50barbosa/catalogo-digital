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

  /** Asaas (Parte B). Chaves só via env. */
  asaas: {
    apiKey: process.env.ASAAS_API_KEY ?? '',
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN ?? '',
    env: (process.env.ASAAS_ENV ?? 'sandbox') as 'sandbox' | 'production',
    baseUrl:
      process.env.ASAAS_BASE_URL ??
      (process.env.ASAAS_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3'),
  },
} as const
