import { prisma } from '@/lib/prisma'
import type { Unit } from '@prisma/client'

/**
 * Repositório de Product — TODA query filtra por storeId.
 *
 * Para update/delete usamos updateMany/deleteMany com `where: { id, storeId }`:
 * assim é IMPOSSÍVEL alterar/apagar um produto de outra loja, mesmo que o `id`
 * seja forjado. count === 0 significa "não pertence a esta loja".
 */

type ProductWriteData = {
  name: string
  description?: string | null
  price: number
  unit: Unit
  categoryId?: string | null
  catalogItemId?: string | null
  imageUrl?: string | null
  isAvailable?: boolean
  cost?: number | null
  barcode?: string | null
}

/** Vitrine: produtos públicos da loja (respeita showOutOfStock). */
export function listStorefrontProducts(
  storeId: string,
  opts: { showOutOfStock: boolean },
) {
  return prisma.product.findMany({
    where: { storeId, ...(opts.showOutOfStock ? {} : { isAvailable: true }) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

/** Painel: todos os produtos da loja, com categoria. */
export function listProducts(storeId: string) {
  return prisma.product.findMany({
    where: { storeId },
    include: { category: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

/** Busca um produto garantindo que pertence à loja. */
export function getProduct(storeId: string, id: string) {
  return prisma.product.findFirst({ where: { id, storeId } })
}

/**
 * Importação por NF-e: produtos DESTA loja que já têm um dos códigos de barras.
 * Usado para casar itens da nota com o catálogo existente (status "Atualizar").
 */
export function findProductsByBarcodes(storeId: string, barcodes: string[]) {
  if (barcodes.length === 0) return Promise.resolve([])
  return prisma.product.findMany({
    where: { storeId, barcode: { in: barcodes } },
    include: { category: true },
  })
}

export function createProduct(storeId: string, data: ProductWriteData) {
  return prisma.product.create({ data: { storeId, ...data } })
}

export async function updateProduct(
  storeId: string,
  id: string,
  data: ProductWriteData,
): Promise<boolean> {
  const res = await prisma.product.updateMany({ where: { id, storeId }, data })
  return res.count > 0
}

export async function deleteProduct(storeId: string, id: string): Promise<boolean> {
  const res = await prisma.product.deleteMany({ where: { id, storeId } })
  return res.count > 0
}

export async function setProductAvailability(
  storeId: string,
  id: string,
  isAvailable: boolean,
): Promise<boolean> {
  const res = await prisma.product.updateMany({
    where: { id, storeId },
    data: { isAvailable },
  })
  return res.count > 0
}

export async function setProductPrice(
  storeId: string,
  id: string,
  price: number,
): Promise<boolean> {
  const res = await prisma.product.updateMany({
    where: { id, storeId },
    data: { price },
  })
  return res.count > 0
}

/** Importação em lote (CSV). */
export function bulkCreateProducts(
  storeId: string,
  items: { name: string; price: number; unit: Unit; categoryId?: string | null }[],
) {
  return prisma.product.createMany({
    data: items.map((i) => ({ storeId, ...i })),
  })
}
