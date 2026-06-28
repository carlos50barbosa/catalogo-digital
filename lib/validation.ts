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
    .regex(/^\d+$/, 'Use apenas números, com DDI e DDD (ex.: 5582999999999)'),
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

export const csvRowSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  categoria: z.string().optional(),
  preco: z.coerce.number().nonnegative('Preço inválido'),
  unidade: unitEnum.default('UN'),
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
