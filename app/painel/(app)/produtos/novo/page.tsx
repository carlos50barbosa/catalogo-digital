import { requireStore } from '@/lib/auth-helpers'
import { listCategories } from '@/lib/data/categories'
import { ProductForm } from '@/components/admin/ProductForm'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const { storeId } = await requireStore()
  const categories = await listCategories(storeId)
  return (
    <ProductForm
      mode="create"
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  )
}
