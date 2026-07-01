import { z } from 'zod'

// Schemas zod para validar TODA entrada de formulário/Server Action.

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

const unitEnum = z.enum(['UN', 'KG', 'L', 'PCT'])
const fulfillmentEnum = z.enum(['DELIVERY_AND_PICKUP', 'DELIVERY_ONLY', 'PICKUP_ONLY'])

export const productSchema = z.object({
  name: z.string().min(1, 'Informe o nome do produto').max(120),
  description: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().nonnegative('Preço inválido'),
  unit: unitEnum,
  categoryId: z.string().min(1).optional().nullable(),
  catalogItemId: z.string().min(1).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isAvailable: z.boolean().optional(),
})

export const priceSchema = z.object({
  price: z.coerce.number().nonnegative('Preço inválido'),
})

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Informe o nome da categoria').max(80),
})

export const settingsSchema = z.object({
  name: z.string().min(1, 'Informe o nome da loja').max(120),
  whatsappNumber: z
    .string()
    .min(10, 'WhatsApp incompleto')
    .max(20)
    .regex(/^\d+$/, 'Informe o WhatsApp com DDD (só números, ex.: 82988887777)'),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor inválida')
    .optional()
    .or(z.literal('')),
  address: z.string().max(255).optional().nullable(),
  deliveryFee: z.coerce.number().nonnegative().default(0),
  minOrderValue: z.coerce.number().nonnegative().default(0),
  pixKey: z.string().max(160).optional().nullable(),
  fulfillment: fulfillmentEnum,
  deliveryZones: z.array(z.string().min(1)).default([]),
  showOutOfStock: z.boolean().optional(),
  orderMessageTemplate: z.string().max(2000).optional().nullable(),
  openingHours: z
    .record(
      z.string(),
      z.object({ open: z.string(), close: z.string() }).nullable(),
    )
    .optional()
    .nullable(),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

// Senha forte: mínimo 8 caracteres, com pelo menos uma letra e um número.
const passwordRule = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(100)
  .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra')
  .regex(/\d/, 'A senha precisa ter pelo menos um número')

export const passwordResetSchema = z.object({
  password: passwordRule,
})

export const signupSchema = z.object({
  ownerName: z.string().min(1, 'Informe seu nome').max(120),
  storeName: z.string().min(1, 'Informe o nome do mercadinho').max(120),
  whatsapp: z
    .string()
    .min(10, 'WhatsApp incompleto')
    .max(20)
    .regex(/^\d+$/, 'Informe o WhatsApp com DDD (só números, ex.: 82988887777)'),
  email: z.string().email('E-mail inválido'),
  password: passwordRule,
  slug: z.string().max(60).optional(),
})

export const checkoutSchema = z.object({
  slug: z.string().min(1),
  customerName: z.string().min(1, 'Informe seu nome').max(120),
  customerPhone: z
    .string()
    .min(8, 'Telefone inválido')
    .max(25)
    .refine((v) => v.replace(/\D/g, '').length >= 10, 'Telefone inválido (com DDD)'),
  fulfillment: z.enum(['DELIVERY', 'PICKUP']),
  address: z.string().max(255).optional().nullable(),
  paymentMethod: z.string().min(1).max(40),
  consent: z.boolean().refine((v) => v === true, {
    message: 'É necessário aceitar a política de privacidade.',
  }),
  // Opt-in OPCIONAL para receber ofertas/contato por WhatsApp (LGPD).
  marketingConsent: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1, 'Carrinho vazio'),
})

export const csvRowSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  categoria: z.string().optional(),
  preco: z.coerce.number().nonnegative('Preço inválido'),
  unidade: unitEnum.default('UN'),
})

// Importação por NF-e: payload de CONFIRMAÇÃO (vem editado do cliente — revalidar tudo).
// cost/price NÃO usam coerce (null = "sem preço" deve ser preservado, não virar 0).
const nfeStatusEnum = z.enum(['UPDATE', 'LIBRARY', 'NEW'])

export const nfeConfirmItemSchema = z.object({
  status: nfeStatusEnum,
  include: z.boolean(),
  name: z.string().min(1, 'Informe o nome do produto').max(120),
  barcode: z.string().max(20).nullable().optional(),
  cost: z.number().finite().nonnegative().nullable().optional(),
  price: z.number().finite().nonnegative().nullable().optional(),
  unit: unitEnum,
  category: z.string().max(80).nullable().optional(),
  productId: z.string().min(1).nullable().optional(), // status UPDATE
  catalogItemId: z.string().min(1).nullable().optional(), // status LIBRARY
  updateName: z.boolean().optional(), // UPDATE: dono editou o nome na revisão?
  updatePrice: z.boolean().optional(), // UPDATE: dono editou o preço na revisão?
})

export const nfeConfirmSchema = z.object({
  accessKey: z.string().regex(/^\d{44}$/, 'Chave de acesso inválida'),
  supplierName: z.string().max(160).nullable().optional(),
  supplierCnpj: z.string().max(20).nullable().optional(),
  items: z.array(nfeConfirmItemSchema).min(1).max(500),
})

export type NfeConfirmInput = z.infer<typeof nfeConfirmSchema>
export type NfeConfirmItemInput = z.infer<typeof nfeConfirmItemSchema>

// ---------- Fiado (caderneta digital) ----------
// Valores monetários sempre positivos. O payload vem do cliente — revalidar tudo no servidor.

const fiadoAmount = z.coerce
  .number()
  .positive('Informe um valor maior que zero')
  .max(1_000_000, 'Valor muito alto')

/** Lançar compra (DEBIT). */
export const fiadoDebitSchema = z.object({
  customerId: z.string().min(1),
  amount: fiadoAmount,
  description: z.string().max(200).optional().nullable(),
  dueDate: z.string().max(40).optional().nullable(), // ISO/yyyy-mm-dd; default no servidor
  orderId: z.string().min(1).optional().nullable(),
  confirm: z.boolean().optional(), // confirma estouro de limite
})

/** Registrar pagamento (CREDIT). */
export const fiadoPaymentSchema = z.object({
  customerId: z.string().min(1),
  amount: fiadoAmount,
  description: z.string().max(200).optional().nullable(),
  confirm: z.boolean().optional(), // confirma pagamento maior que a dívida
})

/** Editar limite de crédito da conta. */
export const fiadoAccountSchema = z.object({
  customerId: z.string().min(1),
  creditLimit: z.coerce.number().nonnegative('Limite inválido').max(1_000_000),
})

/** Configurações de fiado da loja. */
export const fiadoSettingsSchema = z.object({
  fiadoEnabled: z.boolean().optional(),
  fiadoDefaultTermDays: z.coerce.number().int().min(0).max(365).default(30),
  fiadoDefaultCreditLimit: z.coerce.number().nonnegative().max(1_000_000).default(0),
  fiadoReminderTemplate: z.string().max(1000).optional().nullable(),
})

export type ProductInput = z.infer<typeof productSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
export type CategoryInput = z.infer<typeof categorySchema>

/** Converte ZodError em um mapa campo -> primeira mensagem. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
