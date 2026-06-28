'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingCart, CheckCircle2, MessageCircle, Info } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ProductImage } from '@/components/ui/product-image'
import { CheckoutForm } from './CheckoutForm'
import { formatBRL, formatQtyWithUnit, isWeighed } from '@/lib/format'
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
  const [view, setView] = useState<'cart' | 'checkout' | 'confirmation'>('cart')
  const [waUrl, setWaUrl] = useState<string | null>(null)
  const isEmpty = items.length === 0

  function close() {
    onClose()
    setTimeout(() => setView('cart'), 200)
  }

  // ----- Confirmação pós-checkout -----
  if (view === 'confirmation') {
    return (
      <Sheet open={open} onClose={close} title="Pedido registrado">
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-600" />
          <h3 className="font-display text-xl font-bold text-neutral-900">Pedido registrado!</h3>
          <p className="text-neutral-600">
            Agora é só apertar <strong>ENVIAR</strong> no WhatsApp que abriu — o {store.name}{' '}
            confirma o pedido por lá.
          </p>
          <div className="flex w-full items-start gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-left text-sm text-neutral-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No computador, abre o <strong>WhatsApp Web</strong>. A mensagem é editável antes de
              enviar. O pagamento (inclusive PIX) é confirmado pelo mercadinho.
            </span>
          </div>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener" className="w-full">
              <Button className="w-full" size="lg">
                <MessageCircle className="h-5 w-5" /> Reabrir WhatsApp
              </Button>
            </a>
          )}
          <button
            type="button"
            onClick={close}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            Fechar
          </button>
        </div>
      </Sheet>
    )
  }

  // ----- Checkout -----
  if (view === 'checkout') {
    return (
      <Sheet open={open} onClose={close} title="Finalizar pedido">
        <CheckoutForm
          store={store}
          settings={settings}
          items={items}
          subtotal={subtotal}
          onBack={() => setView('cart')}
          onConfirmed={(url) => {
            setWaUrl(url)
            clear()
            setView('confirmation')
          }}
        />
      </Sheet>
    )
  }

  // ----- Carrinho -----
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
          {items.map((item) => {
            const weighed = isWeighed(item.unit)
            const step = weighed ? 0.25 : 1
            return (
              <li key={item.productId} className="flex gap-3 p-4">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-16 w-16 shrink-0 rounded-xl"
                  iconClassName="h-6 w-6"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-medium text-neutral-900">{item.name}</p>
                  <p className="text-sm text-accent">
                    {formatBRL(item.price)}
                    {weighed && <span className="text-xs text-neutral-400"> /kg</span>}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="inline-flex items-center rounded-lg border border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.quantity - step)}
                        aria-label="Diminuir quantidade"
                        className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-14 text-center text-sm font-medium">
                        {formatQtyWithUnit(item.quantity, item.unit)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.quantity + step)}
                        aria-label="Aumentar quantidade"
                        className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">
                      {formatBRL(item.price * item.quantity)}
                      {weighed && <span className="ml-1 text-xs font-normal text-neutral-400">(aprox.)</span>}
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
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
