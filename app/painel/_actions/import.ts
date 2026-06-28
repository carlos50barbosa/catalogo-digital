'use server'

import { revalidatePath } from 'next/cache'
import { requireStore } from '@/lib/auth-helpers'
import { bulkCreateProducts } from '@/lib/data/products'
import { getOrCreateCategoryByName } from '@/lib/data/categories'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { productLimit } from '@/lib/plans'
import type { Unit } from '@/lib/types'

type ImportRow = { name: string; category: string; price: number; unit: Unit }

const MAX_ROWS = 1000

export async function importProductsAction(rows: ImportRow[]) {
  const { storeId } = await requireStore()
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false as const, imported: 0, error: 'Nada para importar.' }
  }
  if (rows.length > MAX_ROWS) {
    return { ok: false as const, imported: 0, error: `Máximo de ${MAX_ROWS} produtos por importação.` }
  }

  // Feature gating: não ultrapassar o limite de produtos do plano.
  const store = await getStoreForPanel(storeId)
  if (store) {
    const limit = productLimit(store.plan)
    if (limit !== null) {
      const count = await countProducts(storeId)
      if (count + rows.length > limit) {
        const left = Math.max(0, limit - count)
        return {
          ok: false as const,
          imported: 0,
          error: `Seu plano permite até ${limit} produtos (você já tem ${count}). Importe no máximo ${left} — ou fale com a gente para liberar mais.`,
        }
      }
    }
  }

  // Resolve categorias por nome (cria as que faltarem), escopadas na loja.
  const uniqueCats = Array.from(
    new Set(rows.map((r) => r.category?.trim()).filter((s): s is string => !!s)),
  )
  const catMap = new Map<string, string>()
  for (const name of uniqueCats) {
    const cat = await getOrCreateCategoryByName(storeId, name)
    if (cat) catMap.set(name.toLowerCase(), cat.id)
  }

  const items = rows.map((r) => {
    const key = r.category?.trim().toLowerCase()
    return {
      name: r.name,
      price: Number(r.price),
      unit: r.unit,
      categoryId: key ? (catMap.get(key) ?? null) : null,
    }
  })

  const result = await bulkCreateProducts(storeId, items)
  revalidatePath('/painel/produtos')
  revalidatePath('/painel')
  return { ok: true as const, imported: result.count }
}
