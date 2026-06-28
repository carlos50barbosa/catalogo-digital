import { requireStore } from '@/lib/auth-helpers'
import { listProducts } from '@/lib/data/products'
import { decimalToNumber } from '@/lib/format'
import { ProductTable, type AdminProduct } from '@/components/admin/ProductTable'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const { storeId } = await requireStore()
  const products = await listProducts(storeId)

  const initial: AdminProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: decimalToNumber(p.price),
    unit: p.unit,
    imageUrl: p.imageUrl,
    isAvailable: p.isAvailable,
    categoryName: p.category?.name ?? null,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Produtos</h1>
        <p className="text-sm text-neutral-500">
          Toque no preço para editar rápido e use o botão para marcar como esgotado.
        </p>
      </div>
      <ProductTable initial={initial} />
    </div>
  )
}
