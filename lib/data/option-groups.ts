import { prisma } from '@/lib/prisma'

/**
 * Repositório de complementos (OptionGroup / Option / ProductOptionGroup).
 * Escopado por storeId, como todo repositório de loja.
 *
 * O vínculo produto↔grupo (ProductOptionGroup) é o que AUTORIZA a opção no
 * pedido: no checkout não basta a opção pertencer à loja, ela precisa estar
 * ligada àquele produto. Ver validateAndPrice em lib/data/orders.ts.
 */

export function listOptionGroups(storeId: string) {
  return prisma.optionGroup.findMany({
    where: { storeId },
    include: {
      options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      _count: { select: { products: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export function getOptionGroup(storeId: string, id: string) {
  return prisma.optionGroup.findFirst({
    where: { id, storeId },
    include: { options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
  })
}

export async function createOptionGroup(
  storeId: string,
  data: { name: string; minSelect: number; maxSelect: number },
) {
  const last = await prisma.optionGroup.findFirst({
    where: { storeId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  return prisma.optionGroup.create({
    data: { ...data, storeId, sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
}

/** Atualiza o grupo. Retorna false se ele não é desta loja. */
export async function updateOptionGroup(
  storeId: string,
  id: string,
  data: { name: string; minSelect: number; maxSelect: number },
): Promise<boolean> {
  const r = await prisma.optionGroup.updateMany({ where: { id, storeId }, data })
  return r.count > 0
}

export async function deleteOptionGroup(storeId: string, id: string): Promise<boolean> {
  const r = await prisma.optionGroup.deleteMany({ where: { id, storeId } })
  return r.count > 0
}

/** Cria uma opção dentro de um grupo, confirmando antes que o grupo é da loja. */
export async function createOption(
  storeId: string,
  groupId: string,
  data: { name: string; priceDelta: number; defaultSelected: boolean },
) {
  const group = await prisma.optionGroup.findFirst({
    where: { id: groupId, storeId },
    select: { id: true },
  })
  if (!group) return null
  const last = await prisma.option.findFirst({
    where: { groupId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  return prisma.option.create({
    data: { ...data, groupId, sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
}

/**
 * Atualiza/remove uma opção. O escopo por loja é garantido pelo filtro no
 * grupo-pai (`group: { storeId }`) — Option não carrega storeId próprio.
 */
export async function updateOption(
  storeId: string,
  id: string,
  data: { name?: string; priceDelta?: number; defaultSelected?: boolean; isAvailable?: boolean },
): Promise<boolean> {
  const r = await prisma.option.updateMany({ where: { id, group: { storeId } }, data })
  return r.count > 0
}

export async function deleteOption(storeId: string, id: string): Promise<boolean> {
  const r = await prisma.option.deleteMany({ where: { id, group: { storeId } } })
  return r.count > 0
}

/** Grupos ligados a um produto (para a tela de edição do produto). */
export function listProductGroupIds(storeId: string, productId: string) {
  return prisma.productOptionGroup.findMany({
    where: { productId, group: { storeId } },
    select: { groupId: true },
  })
}

/**
 * Redefine QUAIS grupos o produto usa. Substitui o conjunto inteiro numa
 * transação; ignora ids que não sejam da loja.
 */
export async function setProductOptionGroups(
  storeId: string,
  productId: string,
  groupIds: string[],
): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    select: { id: true },
  })
  if (!product) return false

  const valid = groupIds.length
    ? await prisma.optionGroup.findMany({
        where: { id: { in: groupIds }, storeId },
        select: { id: true },
      })
    : []

  await prisma.$transaction([
    prisma.productOptionGroup.deleteMany({ where: { productId } }),
    ...(valid.length
      ? [
          prisma.productOptionGroup.createMany({
            data: valid.map((g, i) => ({ productId, groupId: g.id, sortOrder: i })),
          }),
        ]
      : []),
  ])
  return true
}
