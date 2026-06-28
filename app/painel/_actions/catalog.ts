'use server'

import { requireStore } from '@/lib/auth-helpers'
import { searchCatalogItems } from '@/lib/data/catalog'
import { serializeCatalogItem } from '@/lib/serialize'
import type { SerializedCatalogItem } from '@/lib/types'

/** Busca na biblioteca compartilhada (global). Exige apenas estar logado. */
export async function searchCatalogAction(query: string): Promise<SerializedCatalogItem[]> {
  await requireStore()
  const items = await searchCatalogItems(query, 30)
  return items.map(serializeCatalogItem)
}
