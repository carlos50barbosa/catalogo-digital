import { requireStore } from '@/lib/auth-helpers'
import { listCategories } from '@/lib/data/categories'
import { getStoreForPanel } from '@/lib/data/stores'
import { listOptionGroups } from '@/lib/data/option-groups'
import { hasOptions } from '@/lib/segment'
import { ProductForm } from '@/components/admin/ProductForm'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const { storeId } = await requireStore()
  const [categories, store] = await Promise.all([
    listCategories(storeId),
    getStoreForPanel(storeId),
  ])
  // Mercadinho não vê complementos (lista vazia esconde a seção no formulário).
  const groups = hasOptions(store?.segment) ? await listOptionGroups(storeId) : []

  return (
    <ProductForm
      mode="create"
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      optionGroups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        optionCount: g.options.length,
      }))}
    />
  )
}
