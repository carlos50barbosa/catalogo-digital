import Image from 'next/image'
import { ShoppingCart, Search, Store as StoreIcon, Clock, Truck, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { uploadSrc } from '@/lib/utils'
import type { SerializedStore, SerializedSettings } from '@/lib/types'
import type { OpenStatus } from '@/lib/store-hours'

function FulfillmentBadge({ fulfillment }: { fulfillment: SerializedSettings['fulfillment'] }) {
  const map = {
    DELIVERY_AND_PICKUP: { icon: Truck, label: 'Entrega e retirada' },
    DELIVERY_ONLY: { icon: Truck, label: 'Só entrega' },
    PICKUP_ONLY: { icon: ShoppingBag, label: 'Só retirada' },
  } as const
  const { icon: Icon, label } = map[fulfillment]
  return (
    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}

export function StoreHeader({
  store,
  settings,
  openStatus,
  cartCount,
  query,
  onQueryChange,
  onOpenCart,
}: {
  store: SerializedStore
  settings: SerializedSettings
  openStatus: OpenStatus
  cartCount: number
  query: string
  onQueryChange: (v: string) => void
  onOpenCart: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {store.logoUrl ? (
              <Image src={uploadSrc(store.logoUrl) as string} alt={`Logo ${store.name}`} fill className="object-cover" sizes="48px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <StoreIcon className="h-6 w-6" aria-hidden />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold text-neutral-900">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {openStatus.isOpen === null ? (
                <FulfillmentBadge fulfillment={settings.fulfillment} />
              ) : openStatus.isOpen ? (
                <Badge tone="success">
                  <Clock className="h-3 w-3" aria-hidden /> Aberto
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Badge tone="neutral">
                    <Clock className="h-3 w-3" aria-hidden /> Fechado
                  </Badge>
                  {openStatus.nextOpen && (
                    <span className="text-xs text-neutral-500">abre {openStatus.nextOpen}</span>
                  )}
                </span>
              )}
              {openStatus.isOpen !== null && <FulfillmentBadge fulfillment={settings.fulfillment} />}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Abrir carrinho com ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar produtos..."
            aria-label="Buscar produtos"
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </header>
  )
}
