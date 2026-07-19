import type { OrderItemOption } from '@/lib/order/buildWhatsAppMessage'

/**
 * Lê o snapshot de complementos gravado em OrderItem.options (Json).
 *
 * Defensivo de propósito: é um campo Json histórico, então pode conter
 * qualquer coisa — null de pedidos anteriores aos complementos, ou um formato
 * antigo se o snapshot mudar de forma no futuro. Um pedido de 2 anos atrás não
 * pode derrubar a tela de detalhe.
 */
export function readOptionSnapshot(raw: unknown): OrderItemOption[] {
  if (!Array.isArray(raw)) return []
  const out: OrderItemOption[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.name !== 'string' || !o.name) continue
    out.push({
      name: o.name,
      priceDelta: Number(o.priceDelta) || 0,
      removed: o.removed === true,
    })
  }
  return out
}
