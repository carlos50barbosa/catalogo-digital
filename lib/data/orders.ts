import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/format'
import type { Unit } from '@prisma/client'

/**
 * Repositório de Order — escopado por storeId.
 *
 * SEGURANÇA: createOrder NUNCA confia em preços vindos do cliente. Ele busca os
 * produtos no banco (filtrando por storeId), valida que pertencem à loja e
 * recalcula subtotal/taxa/total no servidor. Snapshot de nome/unidade/preço.
 */

export type CreateOrderInput = {
  items: { productId: string; quantity: number }[]
  customerName: string
  customerPhone: string
  fulfillment: 'DELIVERY' | 'PICKUP'
  address?: string | null
  paymentMethod: string
}

export type ComputedItem = {
  productId: string
  name: string
  unit: Unit
  quantity: number
  unitPrice: number
  lineTotal: number
  isEstimated: boolean
}

export type CreateOrderResult =
  | {
      ok: true
      orderId: string
      items: ComputedItem[]
      subtotal: number
      deliveryFee: number
      total: number
    }
  | { ok: false; error: string }

function round(n: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round((n + Number.EPSILON) * f) / f
}

export async function createOrder(
  storeId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (!input.items.length) return { ok: false, error: 'Carrinho vazio.' }

  // Configurações da loja (taxa, mínimo, modalidade).
  const settings = await prisma.storeSettings.findUnique({ where: { storeId } })
  const deliveryFeeCfg = settings ? decimalToNumber(settings.deliveryFee) : 0
  const minOrder = settings ? decimalToNumber(settings.minOrderValue) : 0
  const fulfillmentCfg = settings?.fulfillment ?? 'DELIVERY_AND_PICKUP'

  // Valida a modalidade contra o que a loja permite.
  if (input.fulfillment === 'DELIVERY' && fulfillmentCfg === 'PICKUP_ONLY') {
    return { ok: false, error: 'Esta loja só faz retirada.' }
  }
  if (input.fulfillment === 'PICKUP' && fulfillmentCfg === 'DELIVERY_ONLY') {
    return { ok: false, error: 'Esta loja só faz entrega.' }
  }
  if (input.fulfillment === 'DELIVERY' && !input.address?.trim()) {
    return { ok: false, error: 'Endereço obrigatório para entrega.' }
  }

  // Busca os produtos DA LOJA (valida pertencimento por storeId).
  const ids = [...new Set(input.items.map((i) => i.productId))]
  const products = await prisma.product.findMany({ where: { id: { in: ids }, storeId } })
  const byId = new Map(products.map((p) => [p.id, p]))

  const computed: ComputedItem[] = []
  for (const item of input.items) {
    const p = byId.get(item.productId)
    if (!p) return { ok: false, error: 'Há um item inválido no carrinho.' }
    if (!p.isAvailable) return { ok: false, error: `"${p.name}" está esgotado.` }

    const isWeighed = p.unit === 'KG'
    let qty = Number(item.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: `Quantidade inválida para "${p.name}".` }
    }
    qty = isWeighed ? round(qty, 3) : Math.round(qty)
    if (qty <= 0) return { ok: false, error: `Quantidade inválida para "${p.name}".` }

    const unitPrice = decimalToNumber(p.price)
    const lineTotal = round(unitPrice * qty)
    computed.push({
      productId: p.id,
      name: p.name, // snapshot
      unit: p.unit,
      quantity: qty,
      unitPrice, // snapshot
      lineTotal,
      isEstimated: isWeighed,
    })
  }

  const subtotal = round(computed.reduce((s, i) => s + i.lineTotal, 0))
  if (subtotal < minOrder) {
    return { ok: false, error: `Pedido mínimo de R$ ${minOrder.toFixed(2)}.` }
  }
  const deliveryFee = input.fulfillment === 'DELIVERY' ? deliveryFeeCfg : 0
  const total = round(subtotal + deliveryFee)

  const phone = input.customerPhone.replace(/\D/g, '')
  const name = input.customerName.trim()
  const address = input.address?.trim() || null

  // Upsert do cliente + criação do pedido numa transação.
  const order = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId, phone } },
      create: { storeId, name, phone, address, lastOrderAt: new Date() },
      update: { name, address: address ?? undefined, lastOrderAt: new Date() },
    })
    return tx.order.create({
      data: {
        storeId,
        customerId: customer.id,
        customerName: name,
        customerPhone: phone,
        fulfillment: input.fulfillment,
        address,
        paymentMethod: input.paymentMethod,
        subtotal,
        deliveryFee,
        total,
        items: {
          create: computed.map((c) => ({
            productId: c.productId,
            name: c.name,
            unit: c.unit,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            lineTotal: c.lineTotal,
            isEstimated: c.isEstimated,
          })),
        },
      },
    })
  })

  return { ok: true, orderId: order.id, items: computed, subtotal, deliveryFee, total }
}

// ---------- Leituras do painel (escopadas por storeId) ----------

export function listOrders(storeId: string, take = 100) {
  return prisma.order.findMany({
    where: { storeId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  })
}

export function getOrder(storeId: string, id: string) {
  return prisma.order.findFirst({
    where: { id, storeId },
    include: { items: true },
  })
}

/** Estatísticas dos pedidos GERADOS desde uma data. */
export async function getOrderStats(storeId: string, since: Date) {
  const agg = await prisma.order.aggregate({
    where: { storeId, createdAt: { gte: since } },
    _count: true,
    _sum: { total: true },
  })
  const count = agg._count
  const totalValue = decimalToNumber(agg._sum.total)
  return {
    count,
    totalValue,
    averageTicket: count > 0 ? totalValue / count : 0,
  }
}
