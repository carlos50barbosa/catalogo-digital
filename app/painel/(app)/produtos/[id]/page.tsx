import { notFound } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import { getProduct } from '@/lib/data/products'
import { listCategories } from '@/lib/data/categories'
import { getStoreForPanel } from '@/lib/data/stores'
import { listOptionGroups, listProductGroupIds } from '@/lib/data/option-groups'
import { hasOptions } from '@/lib/segment'
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

  const [product, categories, store] = await Promise.all([
    getProduct(storeId, id), // escopado por storeId: não acessa produto de outra loja
    listCategories(storeId),
    getStoreForPanel(storeId),
  ])
  if (!product) notFound()

  // Mercadinho não vê complementos (lista vazia esconde a seção no formulário).
  const usaComplementos = hasOptions(store?.segment)
  const [groups, ligados] = usaComplementos
    ? await Promise.all([listOptionGroups(storeId), listProductGroupIds(storeId, id)])
    : [[], []]

  return (
    <ProductForm
      mode="edit"
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      optionGroups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        optionCount: g.options.length,
      }))}
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
        optionGroupIds: ligados.map((l) => l.groupId),
      }}
    />
  )
}
