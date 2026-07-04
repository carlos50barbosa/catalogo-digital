'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ProductImage } from '@/components/ui/product-image'
import { formatBRL, formatQtyWithUnit, isWeighed, unitSuffix, UNIT_LABELS } from '@/lib/format'
import type { SerializedProduct } from '@/lib/types'

/**
 * Detalhe do produto (bottom sheet / drawer). Mostra imagem grande, descrição
 * e um seletor de quantidade antes de adicionar ao carrinho. O botão "+" do card
 * continua adicionando direto (qty=1) sem abrir isto.
 */
export function ProductSheet({
  product,
  open,
  onClose,
  onAdd,
}: {
  product: SerializedProduct | null
  open: boolean
  onClose: () => void
  onAdd: (p: SerializedProduct, qty: number) => void
}) {
  const weighed = product ? isWeighed(product.unit) : false
  const step = weighed ? 0.25 : 1
  const [qty, setQty] = useState(step)

  // Reinicia a quantidade sempre que abrir um produto (respeitando o passo).
  useEffect(() => {
    if (open) setQty(step)
  }, [open, product?.id, step])

  if (!product) return null

  const unavailable = !product.isAvailable
  const round3 = (n: number) => Math.round(n * 1000) / 1000

  function add() {
    if (!product || unavailable) return
    onAdd(product, qty)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product.name}
      footer={
        <div className="space-y-3">
          {!unavailable && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Quantidade</span>
              <div className="inline-flex items-center rounded-lg border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(step, round3(q - step)))}
                  aria-label="Diminuir quantidade"
                  className="flex h-9 w-9 items-center justify-center text-neutral-600 hover:bg-neutral-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-16 text-center text-sm font-medium">
                  {formatQtyWithUnit(qty, product.unit)}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, round3(q + step)))}
                  aria-label="Aumentar quantidade"
                  className="flex h-9 w-9 items-center justify-center text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <Button onClick={add} disabled={unavailable} className="w-full" size="lg">
            {unavailable ? (
              'Produto esgotado'
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" /> Adicionar • {formatBRL(product.price * qty)}
                {weighed && <span className="text-xs font-normal opacity-80">(aprox.)</span>}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="p-4">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full rounded-2xl"
        />

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          {UNIT_LABELS[product.unit]}
        </p>
        <h3 className="font-display text-lg font-semibold leading-snug text-neutral-900">
          {product.name}
        </h3>
        <p className="mt-1 font-display text-xl font-bold text-accent">
          {formatBRL(product.price)}
          <span className="text-sm font-normal text-neutral-400">{unitSuffix(product.unit)}</span>
        </p>

        {product.description ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>
        ) : (
          <p className="mt-4 text-sm italic text-neutral-400">Sem descrição.</p>
        )}
      </div>
    </Sheet>
  )
}
