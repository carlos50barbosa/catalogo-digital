import { prisma } from '@/lib/prisma'

/** Repositório de Customer — sempre escopado por storeId. */

/** Lista a base de clientes da loja com nº de pedidos gerados. */
export function listCustomers(storeId: string) {
  return prisma.customer.findMany({
    where: { storeId },
    include: { _count: { select: { orders: true } } },
    orderBy: [{ lastOrderAt: 'desc' }, { createdAt: 'desc' }],
  })
}

export function countCustomers(storeId: string) {
  return prisma.customer.count({ where: { storeId } })
}

/** Busca um cliente garantindo que pertence à loja. */
export function getCustomer(storeId: string, id: string) {
  return prisma.customer.findFirst({ where: { id, storeId } })
}
