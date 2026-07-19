'use client'

import { useMemo, useState } from 'react'
import { ShoppingCart, PackageOpen, SearchX, MapPin, Clock } from 'lucide-react'
import { StoreHeader } from './StoreHeader'
import { CategoryNav } from './CategoryNav'
import { ProductCard } from './ProductCard'
import { ProductSheet } from './ProductSheet'
import { CartSheet } from './CartSheet'
import { useCart } from './use-cart'
import { formatBRL } from '@/lib/format'
import type {
  SerializedStore,
  SerializedSettings,
  SerializedCategory,
  SerializedProduct,
} from '@/lib/types'
import type { OpenStatus } from '@/lib/store-hours'

export function StorefrontClient({
  store,
  settings,
  categories,
  products,
  openStatus,
}: {
  store: SerializedStore
  settings: SerializedSettings
  categories: SerializedCategory[]
  products: SerializedProduct[]
  openStatus: OpenStatus
}) {
  const cart = useCart(store.slug, products)
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [cartOpen, setCartOpen] = useState(false)
  const [selected, setSelected] = useState<SerializedProduct | null>(null)

  const q = query.trim().toLowerCase()
  const searching = q.length > 0

  const flat = useMemo(() => {
    if (searching) return products.filter((p) => p.name.toLowerCase().includes(q))
    if (activeCat !== 'all') return products.filter((p) => p.categoryId === activeCat)
    return null
  }, [products, q, searching, activeCat])

  // Quando "Todos" e sem busca: seções por categoria.
  const sections = useMemo(() => {
    if (flat) return null
    const byCat = new Map<string, SerializedProduct[]>()
    for (const p of products) {
      const key = p.categoryId ?? '__none'
      const arr = byCat.get(key) ?? []
      arr.push(p)
      byCat.set(key, arr)
    }
    const out = categories
      .filter((c) => byCat.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, products: byCat.get(c.id)! }))
    if (byCat.has('__none')) {
      out.push({ id: '__none', name: 'Outros', products: byCat.get('__none')! })
    }
    return out
  }, [products, categories, flat])

  // Soma TODAS as linhas do mesmo produto: com complementos, um X-Burguer pode
  // estar no carrinho em três montagens diferentes e o card mostra o total.
  const qtyMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const i of cart.items) m[i.productId] = (m[i.productId] ?? 0) + i.quantity
    return m
  }, [cart.items])

  /**
   * "+" do card: adiciona direto só quando não há nada para montar. Com grupos,
   * abre a ficha — adicionar com lista vazia trataria as opções "vem com" como
   * removidas e mandaria "sem alface, sem cebola" para a cozinha.
   */
  function quickAdd(p: SerializedProduct) {
    if (p.optionGroups.length > 0) setSelected(p)
    else cart.add(p, 1)
  }

  function selectCategory(id: string) {
    setActiveCat(id)
    setQuery('')
  }

  const storeEmpty = products.length === 0
  const noResults = flat !== null && flat.length === 0

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      <StoreHeader
        store={store}
        settings={settings}
        openStatus={openStatus}
        cartCount={cart.count}
        query={query}
        onQueryChange={setQuery}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="mx-auto max-w-3xl px-4">
        {!storeEmpty && !searching && (
          <CategoryNav categories={categories} active={activeCat} onSelect={selectCategory} />
        )}

        {storeEmpty ? (
          <EmptyState
            icon={<PackageOpen className="h-10 w-10 text-neutral-300" />}
            title="Loja sem produtos"
            desc="Esta loja ainda não cadastrou produtos. Volte em breve!"
          />
        ) : noResults ? (
          <EmptyState
            icon={<SearchX className="h-10 w-10 text-neutral-300" />}
            title="Nenhum produto encontrado"
            desc="Tente buscar por outro termo."
          />
        ) : flat ? (
          <section className="py-4">
            <ProductGrid products={flat} qtyMap={qtyMap} onAdd={quickAdd} onOpen={setSelected} />
          </section>
        ) : (
          <div className="py-4">
            {sections!.map((s) => (
              <section key={s.id} className="mb-6" aria-labelledby={`cat-${s.id}`}>
                <h2
                  id={`cat-${s.id}`}
                  className="mb-3 font-display text-lg font-semibold text-neutral-900"
                >
                  {s.name}
                </h2>
                <ProductGrid
                  products={s.products}
                  qtyMap={qtyMap}
                  onAdd={quickAdd}
                  onOpen={setSelected}
                />
              </section>
            ))}
          </div>
        )}

        {/* Rodapé com infos da loja */}
        {!storeEmpty && (
          <footer className="border-t border-neutral-200 py-6 text-sm text-neutral-500">
            {settings.address && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {settings.address}
              </p>
            )}
            {openStatus.todayHours && (
              <p className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" /> {openStatus.todayLabel}: {openStatus.todayHours}
              </p>
            )}
          </footer>
        )}
      </main>

      {/* Barra flutuante "ver carrinho" */}
      {cart.count > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-2xl bg-accent px-5 py-3.5 text-accent-fg shadow-lg"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-5 w-5" />
              Ver carrinho ({cart.count})
            </span>
            <span className="font-display text-lg font-bold">{formatBRL(cart.subtotal)}</span>
          </button>
        </div>
      )}

      <ProductSheet
        product={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onAdd={cart.add}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
        settings={settings}
        items={cart.items}
        subtotal={cart.subtotal}
        isOpen={openStatus.isOpen}
        setQty={cart.setQty}
        remove={cart.remove}
        clear={cart.clear}
      />
    </div>
  )
}

function ProductGrid({
  products,
  qtyMap,
  onAdd,
  onOpen,
}: {
  products: SerializedProduct[]
  qtyMap: Record<string, number>
  onAdd: (p: SerializedProduct) => void
  onOpen: (p: SerializedProduct) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          qtyInCart={qtyMap[p.id] ?? 0}
          onAdd={() => onAdd(p)}
          onOpen={() => onOpen(p)}
        />
      ))}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      {icon}
      <p className="font-display text-lg font-semibold text-neutral-800">{title}</p>
      <p className="max-w-xs text-sm text-neutral-500">{desc}</p>
    </div>
  )
}
