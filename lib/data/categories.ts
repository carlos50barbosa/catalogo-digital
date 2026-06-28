import { prisma } from '@/lib/prisma'

/** Repositório de Category — sempre escopado por storeId. */

export function listCategories(storeId: string) {
  return prisma.category.findMany({
    where: { storeId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function createCategory(storeId: string, name: string) {
  const max = await prisma.category.aggregate({
    where: { storeId },
    _max: { sortOrder: true },
  })
  return prisma.category.create({
    data: { storeId, name, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
}

export async function updateCategory(
  storeId: string,
  id: string,
  data: { name?: string; sortOrder?: number },
): Promise<boolean> {
  const res = await prisma.category.updateMany({ where: { id, storeId }, data })
  return res.count > 0
}

export async function deleteCategory(storeId: string, id: string): Promise<boolean> {
  const res = await prisma.category.deleteMany({ where: { id, storeId } })
  return res.count > 0
}

/** Reordena categorias respeitando a ordem recebida (escopo da loja). */
export async function reorderCategories(storeId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.category.updateMany({ where: { id, storeId }, data: { sortOrder: i } }),
    ),
  )
}

/** Usado na importação CSV: encontra ou cria a categoria por nome, na loja. */
export async function getOrCreateCategoryByName(storeId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return null
  const existing = await prisma.category.findFirst({
    where: { storeId, name: trimmed },
  })
  if (existing) return existing
  return createCategory(storeId, trimmed)
}
