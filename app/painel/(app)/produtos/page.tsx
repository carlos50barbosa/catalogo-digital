import Link from 'next/link'
import { ReceiptText } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { listProducts } from '@/lib/data/products'
import { getStoreForPanel } from '@/lib/data/stores'
import { segmentCopy } from '@/lib/segment'
import { decimalToNumber } from '@/lib/format'
import { ProductTable, type AdminProduct } from '@/components/admin/ProductTable'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const { storeId } = await requireStore()
  const [products, store] = await Promise.all([listProducts(storeId), getStoreForPanel(storeId)])
  const copy = segmentCopy(store?.segment)

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">{copy.itemsLabel}</h1>
          <p className="text-sm text-neutral-500">
            Toque no preço para editar rápido e use o botão para marcar como esgotado.
          </p>
        </div>
        <Link
          href="/painel/importar/nfe"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <ReceiptText className="h-4 w-4" /> Importar da nota (XML)
        </Link>
      </div>
      <ProductTable initial={initial} />
    </div>
  )
}
