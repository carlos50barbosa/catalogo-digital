import { prisma } from '@/lib/prisma'

/**
 * Repositório da BIBLIOTECA COMPARTILHADA (CatalogItem).
 * É global — NÃO tem storeId. É o catálogo mestre reaproveitável entre lojas.
 * (A collation padrão do MySQL/MariaDB já torna o `contains` case-insensitive.)
 */

export function searchCatalogItems(query: string, take = 40) {
  const q = query.trim()
  return prisma.catalogItem.findMany({
    where: q ? { name: { contains: q } } : {},
    orderBy: { name: 'asc' },
    take,
  })
}

export function getCatalogItem(id: string) {
  return prisma.catalogItem.findUnique({ where: { id } })
}
