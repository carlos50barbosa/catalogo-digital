import { notFound } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import { getProduct } from '@/lib/data/products'
import { listCategories } from '@/lib/data/categories'
import { decimalToNumber } from '@/lib/format'
import { ProductForm } from '@/components/admin/ProductForm'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { storeId } = await requireStore()

  const [product, categories] = await Promise.all([
    getProduct(storeId, id), // escopado por storeId: não acessa produto de outra loja
    listCategories(storeId),
  ])
  if (!product) notFound()

  return (
    <ProductForm
      mode="edit"
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      initial={{
        id: product.id,
        name: product.name,
        description: product.description,
        price: decimalToNumber(product.price),
        unit: product.unit,
        categoryId: product.categoryId,
        catalogItemId: product.catalogItemId,
        imageUrl: product.imageUrl,
        isAvailable: product.isAvailable,
      }}
    />
  )
}
