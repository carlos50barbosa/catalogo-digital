// Montagem CENTRALIZADA da mensagem de pedido enviada ao WhatsApp.
// Função pura e isomórfica (usada no checkout, lado cliente). No MVP o pedido
// NÃO é persistido: o pedido É esta mensagem.

import { formatBRL, formatQty, isWeighed } from '@/lib/format'
import type { Unit } from '@/lib/types'

export type OrderItemOption = {
  name: string
  priceDelta: number
  /** Vinha por padrão e o cliente tirou → vira "sem X". */
  removed: boolean
}

export type OrderItem = {
  name: string
  quantity: number
  /** preço unitário JÁ COMPOSTO (base + complementos) */
  unitPrice: number
  unit?: Unit
  /** item por peso → valor aproximado */
  isEstimated?: boolean
  /** complementos que MUDARAM em relação ao item padrão */
  options?: OrderItemOption[]
  /** observação do cliente para a cozinha */
  notes?: string
}

export type FulfillmentType = 'DELIVERY' | 'PICKUP'

export type OrderInput = {
  storeName: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  fulfillmentType: FulfillmentType
  customerName: string
  /** endereço/bairro — apenas quando entrega */
  address?: string
  paymentMethod: string
  /** chave PIX — incluída quando pagamento = PIX */
  pixKey?: string
  /** template customizado opcional da loja (orderMessageTemplate) */
  template?: string | null
}

/**
 * Uma linha por item, com os complementos indentados logo abaixo. Só entra o
 * que MUDOU em relação ao item padrão — listar todo "vem com" mantido viraria
 * uma parede de texto no WhatsApp.
 */
function itemLine(it: OrderItem): string {
  const weighed = it.unit ? isWeighed(it.unit) : false
  const qty = weighed ? `${formatQty(it.quantity)}kg` : `${it.quantity}x`
  const approx = it.isEstimated ? ' (aprox.)' : ''
  const lines = [`• ${qty} ${it.name} — ${formatBRL(it.unitPrice * it.quantity)}${approx}`]

  for (const o of it.options ?? []) {
    if (o.removed) {
      lines.push(`   ✗ sem ${o.name.toLowerCase()}`)
    } else {
      const valor = o.priceDelta !== 0 ? ` (${formatBRL(o.priceDelta)})` : ''
      lines.push(`   + ${o.name}${valor}`)
    }
  }
  if (it.notes) lines.push(`   obs: ${it.notes}`)

  return lines.join('\n')
}

/** Mensagem padrão (usada quando a loja não define orderMessageTemplate). */
function defaultMessage(o: OrderInput): string {
  const lines: string[] = []
  lines.push(`🛒 Novo pedido — ${o.storeName}`)
  lines.push('')
  for (const it of o.items) lines.push(itemLine(it))
  lines.push('')
  lines.push(`Subtotal: ${formatBRL(o.subtotal)}`)
  if (o.fulfillmentType === 'DELIVERY') {
    lines.push(`Taxa de entrega: ${formatBRL(o.deliveryFee)}`)
  }
  lines.push(`Total: ${formatBRL(o.total)}`)
  lines.push('')
  lines.push(`Tipo: ${o.fulfillmentType === 'DELIVERY' ? 'Entrega' : 'Retirada'}`)
  lines.push(`Cliente: ${o.customerName}`)
  if (o.fulfillmentType === 'DELIVERY' && o.address) {
    lines.push(`Endereço: ${o.address}`)
  }
  let pagamento = `Pagamento: ${o.paymentMethod}`
  if (o.pixKey) pagamento += ` (chave: ${o.pixKey})`
  lines.push(pagamento)
  return lines.join('\n')
}

/**
 * Template customizado: substitui placeholders no texto da loja.
 * Placeholders suportados: {loja} {itens} {subtotal} {taxa} {total}
 * {tipo} {cliente} {endereco} {pagamento}
 */
function fromTemplate(tpl: string, o: OrderInput): string {
  const itens = o.items.map(itemLine).join('\n')
  const map: Record<string, string> = {
    loja: o.storeName,
    itens,
    subtotal: formatBRL(o.subtotal),
    taxa: formatBRL(o.deliveryFee),
    total: formatBRL(o.total),
    tipo: o.fulfillmentType === 'DELIVERY' ? 'Entrega' : 'Retirada',
    cliente: o.customerName,
    endereco: o.address ?? '',
    pagamento: o.pixKey ? `${o.paymentMethod} (chave: ${o.pixKey})` : o.paymentMethod,
  }
  return tpl.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in map ? map[key] : `{${key}}`,
  )
}

export function buildWhatsAppMessage(input: OrderInput): string {
  const tpl = input.template?.trim()
  return tpl ? fromTemplate(tpl, input) : defaultMessage(input)
}

/** Monta a URL final wa.me com a mensagem URL-encoded. */
export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digits = (whatsappNumber || '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
