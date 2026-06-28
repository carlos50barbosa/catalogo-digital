import { requireStore } from '@/lib/auth-helpers'
import { listCategories } from '@/lib/data/categories'
import { CategoryManager } from '@/components/admin/CategoryManager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const { storeId } = await requireStore()
  const cats = await listCategories(storeId)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Categorias</h1>
        <p className="text-sm text-neutral-500">Organize seus produtos em seções na vitrine.</p>
      </div>
      <CategoryManager
        initial={cats.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder }))}
      />
    </div>
  )
}
