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
  items: { productId: string; quantity: number; optionIds?: string[]; notes?: string }[]
  customerName: string
  customerPhone: string
  fulfillment: 'DELIVERY' | 'PICKUP'
  address?: string | null
  paymentMethod: string
  /** Opt-in de marketing (LGPD): registra o consentimento no cliente. */
  marketingConsent?: boolean
}

/** Complemento no snapshot do item (o que foi somado ou tirado). */
export type ComputedOption = {
  groupName: string
  name: string
  priceDelta: number
  /** Vinha por padrão e o cliente tirou → "sem cebola". */
  removed: boolean
}

export type ComputedItem = {
  productId: string
  name: string
  unit: Unit
  quantity: number
  /** Preço unitário JÁ COMPOSTO: base + complementos. */
  unitPrice: number
  lineTotal: number
  isEstimated: boolean
  options: ComputedOption[]
  notes?: string
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

  // Busca os produtos DA LOJA (valida pertencimento por storeId), junto com os
  // grupos de complementos LIGADOS a cada produto. É esse vínculo que autoriza
  // a opção: não basta ela ser da loja.
  const ids = [...new Set(input.items.map((i) => i.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, storeId },
    include: {
      optionGroups: {
        orderBy: { sortOrder: 'asc' },
        include: { group: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
      },
    },
  })
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

    // ----- Complementos: revalida TUDO contra o banco -----
    const grupos = p.optionGroups.map((pg) => pg.group)
    // Só as opções dos grupos ligados a ESTE produto entram no universo válido.
    const permitidas = new Map(grupos.flatMap((g) => g.options.map((o) => [o.id, { g, o }])))
    const escolhidas = [...new Set(item.optionIds ?? [])]

    for (const id of escolhidas) {
      const hit = permitidas.get(id)
      // Opção de outro produto/loja, ou inexistente: recusa em vez de ignorar.
      // Ignorar deixaria o cliente montar um lanche que a loja não vende.
      if (!hit) return { ok: false, error: `Há uma opção inválida em "${p.name}".` }
      if (!hit.o.isAvailable) {
        return { ok: false, error: `"${hit.o.name}" acabou. Refaça esse item.` }
      }
    }

    const escolhidasSet = new Set(escolhidas)
    const options: ComputedOption[] = []
    let delta = 0

    for (const g of grupos) {
      const marcadas = g.options.filter((o) => escolhidasSet.has(o.id))
      if (marcadas.length < g.minSelect) {
        return { ok: false, error: `Escolha uma opção em "${g.name}" para "${p.name}".` }
      }
      if (marcadas.length > g.maxSelect) {
        return { ok: false, error: `Você escolheu opções demais em "${g.name}".` }
      }
      for (const o of g.options) {
        const priceDelta = decimalToNumber(o.priceDelta)
        if (escolhidasSet.has(o.id)) {
          delta += priceDelta
          // Espelha a regra da vitrine: registra só o que MUDOU em relação ao
          // item padrão. Um "vem com" mantido não vira linha na comanda.
          if (!o.defaultSelected || priceDelta !== 0) {
            options.push({ groupName: g.name, name: o.name, priceDelta, removed: false })
          }
        } else if (o.defaultSelected) {
          options.push({ groupName: g.name, name: o.name, priceDelta: 0, removed: true })
        }
      }
    }

    const unitPrice = round(decimalToNumber(p.price) + delta)
    if (unitPrice < 0) return { ok: false, error: `Preço inválido para "${p.name}".` }
    const lineTotal = round(unitPrice * qty)
    const notes = item.notes?.trim() || undefined

    computed.push({
      productId: p.id,
      name: p.name, // snapshot
      unit: p.unit,
      quantity: qty,
      unitPrice, // snapshot: base + complementos
      lineTotal,
      isEstimated: isWeighed,
      options,
      notes,
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
    const marketingConsent = input.marketingConsent ?? false
    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId, phone } },
      create: { storeId, name, phone, address, marketingConsent, lastOrderAt: new Date() },
      update: { name, address: address ?? undefined, marketingConsent, lastOrderAt: new Date() },
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
            // Snapshot: o pedido antigo não pode mudar quando a loja editar a
            // opção. null quando não há complementos (mantém o histórico limpo).
            options: c.options.length ? c.options : undefined,
            notes: c.notes,
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
