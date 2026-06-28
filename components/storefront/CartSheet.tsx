'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ProductImage } from '@/components/ui/product-image'
import { CheckoutForm } from './CheckoutForm'
import { formatBRL } from '@/lib/format'
import type { CartItem, SerializedSettings, SerializedStore } from '@/lib/types'

export function CartSheet({
  open,
  onClose,
  store,
  settings,
  items,
  subtotal,
  setQty,
  remove,
  clear,
}: {
  open: boolean
  onClose: () => void
  store: SerializedStore
  settings: SerializedSettings
  items: CartItem[]
  subtotal: number
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clear: () => void
}) {
  const [view, setView] = useState<'cart' | 'checkout'>('cart')
  const isEmpty = items.length === 0

  function close() {
    onClose()
    // pequeno reset ao fechar
    setTimeout(() => setView('cart'), 200)
  }

  if (view === 'checkout') {
    return (
      <Sheet open={open} onClose={close} title="Finalizar pedido">
        <CheckoutForm
          store={store}
          settings={settings}
          items={items}
          subtotal={subtotal}
          onBack={() => setView('cart')}
          onSent={() => {
            clear()
            close()
          }}
        />
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Seu carrinho"
      footer={
        !isEmpty ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-display text-lg font-bold text-neutral-900">
                {formatBRL(subtotal)}
              </span>
            </div>
            <Button onClick={() => setView('checkout')} className="w-full" size="lg">
              Continuar
            </Button>
          </div>
        ) : undefined
      }
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <ShoppingCart className="h-10 w-10 text-neutral-300" />
          <p className="font-medium text-neutral-700">Seu carrinho está vazio</p>
          <p className="text-sm text-neutral-500">Adicione produtos para começar seu pedido.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3 p-4">
              <ProductImage
                src={item.imageUrl}
                alt={item.name}
                className="h-16 w-16 shrink-0 rounded-xl"
                iconClassName="h-6 w-6"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="line-clamp-2 text-sm font-medium text-neutral-900">{item.name}</p>
                <p className="text-sm text-accent">{formatBRL(item.price)}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <div className="inline-flex items-center rounded-lg border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.quantity - 1)}
                      aria-label="Diminuir quantidade"
                      className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.productId, item.quantity + 1)}
                      aria-label="Aumentar quantidade"
                      className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {formatBRL(item.price * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    aria-label={`Remover ${item.name}`}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
