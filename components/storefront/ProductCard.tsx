import { Plus, Check } from 'lucide-react'
import { ProductImage } from '@/components/ui/product-image'
import { formatBRL, unitSuffix, UNIT_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SerializedProduct } from '@/lib/types'

export function ProductCard({
  product,
  qtyInCart,
  onAdd,
}: {
  product: SerializedProduct
  qtyInCart: number
  onAdd: () => void
}) {
  const unavailable = !product.isAvailable
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card',
        unavailable && 'opacity-75',
      )}
    >
      <div className="relative">
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-square w-full" />
        {unavailable && (
          <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-xs font-medium text-white">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          {UNIT_LABELS[product.unit]}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="font-display text-base font-bold text-accent">
            {formatBRL(product.price)}
            <span className="text-xs font-normal text-neutral-400">{unitSuffix(product.unit)}</span>
          </p>
          <button
            type="button"
            onClick={onAdd}
            disabled={unavailable}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            className={cn(
              'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-xl px-2.5 text-sm font-semibold transition',
              unavailable
                ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                : 'bg-accent text-accent-fg hover:opacity-90',
            )}
          >
            {qtyInCart > 0 ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> {qtyInCart}
              </>
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
