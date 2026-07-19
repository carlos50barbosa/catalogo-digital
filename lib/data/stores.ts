import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import type { Prisma, Fulfillment, StoreSegment } from '@prisma/client'

/**
 * Exclui a loja e TODOS os dados vinculados (LGPD / porta de saída).
 * As FKs têm onDelete: Cascade, então o delete remove usuários, produtos,
 * pedidos, clientes, fiado, assinatura e settings. Depois apaga as imagens da
 * loja do storage. Auditoria (AdminAuditLog) e BillingEvent sobrevivem de
 * propósito (sem FK / SetNull). NÃO cancela a assinatura no gateway — quem
 * chama deve cancelar antes, se aplicável.
 */
export async function deleteStore(storeId: string): Promise<void> {
  await prisma.store.delete({ where: { id: storeId } })
  await storage.deletePrefix(`stores/${storeId}`)
}

/**
 * Repositório de Store.
 *
 * REGRA DE OURO (isolamento multi-tenant):
 * - Vitrine: a loja é resolvida pelo SLUG da URL (somente dados públicos).
 * - Painel: a loja vem SEMPRE do storeId da sessão autenticada, nunca de input.
 */

/** Vitrine pública — resolve a loja pelo slug. Memoizado por request (React
 *  cache): generateMetadata e a página compartilham a mesma query no pageview. */
export const getStoreBySlug = cache((slug: string) => {
  return prisma.store.findUnique({
    where: { slug },
    include: { settings: true },
  })
})

/** Painel — carrega a loja pelo storeId (vindo da sessão). */
export function getStoreForPanel(storeId: string) {
  return prisma.store.findUnique({
    where: { id: storeId },
    include: { settings: true },
  })
}

export async function countProducts(storeId: string) {
  return prisma.product.count({ where: { storeId } })
}

/** Incrementa o contador de visualizações da vitrine (fire-and-forget na página). */
export async function incrementStoreView(storeId: string): Promise<void> {
  await prisma.store.update({
    where: { id: storeId },
    data: { viewCount: { increment: 1 } },
  })
}

/** Atualiza dados de marca/identidade da loja. */
export async function updateStoreProfile(
  storeId: string,
  data: {
    name: string
    segment: StoreSegment
    whatsappNumber: string
    accentColor: string | null
    logoUrl?: string | null
  },
) {
  await prisma.store.update({ where: { id: storeId }, data })
}

/** Cria/atualiza as configurações 1-1 da loja. */
export async function upsertStoreSettings(
  storeId: string,
  data: {
    address: string | null
    deliveryFee: number
    minOrderValue: number
    pixKey: string | null
    fulfillment: Fulfillment
    deliveryZones: string[]
    openingHours: Record<string, { open: string; close: string } | null> | null
    showOutOfStock: boolean
    orderMessageTemplate: string | null
  },
) {
  const payload = {
    address: data.address,
    deliveryFee: data.deliveryFee,
    minOrderValue: data.minOrderValue,
    pixKey: data.pixKey,
    fulfillment: data.fulfillment,
    deliveryZones: (data.deliveryZones ?? []) as unknown as Prisma.InputJsonValue,
    openingHours: (data.openingHours ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
    showOutOfStock: data.showOutOfStock,
    orderMessageTemplate: data.orderMessageTemplate,
  }
  await prisma.storeSettings.upsert({
    where: { storeId },
    create: { storeId, ...payload },
    update: payload,
  })
}
