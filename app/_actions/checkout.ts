'use server'

import { headers } from 'next/headers'
import { getStoreBySlug } from '@/lib/data/stores'
import { createOrder } from '@/lib/data/orders'
import { serializeSettings } from '@/lib/serialize'
import { checkoutSchema, fieldErrors } from '@/lib/validation'
import { buildWhatsAppMessage, buildWhatsAppUrl } from '@/lib/order/buildWhatsAppMessage'
import { rateLimit } from '@/lib/rate-limit'
import { isStorePublic } from '@/lib/store-status'

export type CheckoutResult =
  | { ok: true; waUrl: string; orderId: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }

/**
 * Rota PÚBLICA (vitrine, sem autenticação) que registra o pedido server-side.
 * - rate limit por IP
 * - validação zod
 * - recálculo TOTAL no servidor (preços nunca vêm do cliente)
 * - grava Order + OrderItem + upsert Customer
 * - devolve a URL wa.me montada no servidor
 */
export async function createOrderAction(input: unknown): Promise<CheckoutResult> {
  const h = await headers()
  const ip =
    (h.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  if (!rateLimit(`order:${ip}`)) {
    return { ok: false, error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }
  }

  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }
  const data = parsed.data

  const store = await getStoreBySlug(data.slug)
  // Alinha o guard com a vitrine: só aceita pedido se a loja está pública
  // (status vivo E publicada) — não só pelo campo legado isActive.
  if (!store || !isStorePublic(store.status, store.published, store.trialEndsAt)) {
    return { ok: false, error: 'Loja indisponível.' }
  }

  const result = await createOrder(store.id, {
    items: data.items,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    fulfillment: data.fulfillment,
    address: data.address ?? null,
    paymentMethod: data.paymentMethod,
    marketingConsent: data.marketingConsent,
  })
  if (!result.ok) return { ok: false, error: result.error }

  const settings = serializeSettings(store.settings)
  const message = buildWhatsAppMessage({
    storeName: store.name,
    items: result.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      unit: i.unit,
      isEstimated: i.isEstimated,
      options: i.options,
      notes: i.notes,
    })),
    subtotal: result.subtotal,
    deliveryFee: result.deliveryFee,
    total: result.total,
    fulfillmentType: data.fulfillment,
    customerName: data.customerName,
    address: data.address ?? undefined,
    paymentMethod: data.paymentMethod,
    pixKey: data.paymentMethod === 'PIX' ? (settings.pixKey ?? undefined) : undefined,
    template: settings.orderMessageTemplate,
  })
  const waUrl = buildWhatsAppUrl(store.whatsappNumber, message)

  return { ok: true, waUrl, orderId: result.orderId }
}
