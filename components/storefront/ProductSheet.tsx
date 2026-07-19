'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingCart, AlertCircle } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ProductImage } from '@/components/ui/product-image'
import { formatBRL, formatQtyWithUnit, isWeighed, unitSuffix, UNIT_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SerializedProduct, SerializedOptionGroup } from '@/lib/types'

/**
 * Detalhe do produto (bottom sheet / drawer). Quando o item tem grupos de
 * complementos, é aqui que o cliente monta o lanche: escolhe adicionais, tira
 * ingredientes ("vem com" desmarcado) e escreve uma observação.
 *
 * O preço mostrado é só previsão — o servidor reprecifica tudo no checkout.
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
  onAdd: (p: SerializedProduct, qty: number, optionIds: string[], notes?: string) => void
}) {
  const weighed = product ? isWeighed(product.unit) : false
  const step = weighed ? 0.25 : 1
  const [qty, setQty] = useState(step)
  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const groups = useMemo(() => product?.optionGroups ?? [], [product])

  // Ao abrir um item: zera a quantidade e pré-marca as opções "vem com"
  // (disponíveis). É o estado padrão do lanche montado.
  useEffect(() => {
    if (!open) return
    setQty(step)
    setNotes('')
    setShowErrors(false)
    setSelected(
      groups.flatMap((g) =>
        g.options.filter((o) => o.defaultSelected && o.isAvailable).map((o) => o.id),
      ),
    )
  }, [open, product?.id, step, groups])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const extra = useMemo(() => {
    let sum = 0
    for (const g of groups) {
      for (const o of g.options) if (selectedSet.has(o.id)) sum += o.priceDelta
    }
    return sum
  }, [groups, selectedSet])

  // Grupos obrigatórios (minSelect >= 1) ainda não satisfeitos.
  const pendentes = useMemo(
    () =>
      groups.filter(
        (g) => g.options.filter((o) => selectedSet.has(o.id)).length < g.minSelect,
      ),
    [groups, selectedSet],
  )

  if (!product) return null

  const unavailable = !product.isAvailable
  const round3 = (n: number) => Math.round(n * 1000) / 1000
  const unitPrice = Math.round((product.price + extra) * 100) / 100

  function toggle(group: SerializedOptionGroup, optionId: string) {
    setSelected((prev) => {
      const isOn = prev.includes(optionId)
      if (isOn) return prev.filter((id) => id !== optionId)

      const idsDoGrupo = group.options.map((o) => o.id)
      const noGrupo = prev.filter((id) => idsDoGrupo.includes(id))

      // Escolha única: a nova troca a anterior, em vez de recusar o clique.
      if (group.maxSelect === 1) {
        return [...prev.filter((id) => !idsDoGrupo.includes(id)), optionId]
      }
      if (noGrupo.length >= group.maxSelect) return prev // no teto: ignora
      return [...prev, optionId]
    })
  }

  function add() {
    if (!product || unavailable) return
    if (pendentes.length > 0) {
      setShowErrors(true)
      return
    }
    onAdd(product, qty, selected, notes)
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

          {showErrors && pendentes.length > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Escolha em <strong>{pendentes[0].name}</strong> para continuar.
            </p>
          )}

          <Button onClick={add} disabled={unavailable} className="w-full" size="lg">
            {unavailable ? (
              'Produto esgotado'
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" /> Adicionar • {formatBRL(unitPrice * qty)}
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

      {/* Montagem do item */}
      {!unavailable && groups.length > 0 && (
        <div className="space-y-4 border-t border-neutral-100 p-4">
          {groups.map((g) => {
            const marcadas = g.options.filter((o) => selectedSet.has(o.id)).length
            const faltando = showErrors && marcadas < g.minSelect
            const noTeto = marcadas >= g.maxSelect
            return (
              <fieldset key={g.id}>
                <legend className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{g.name}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      faltando
                        ? 'bg-red-50 text-red-700'
                        : g.minSelect >= 1
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-500',
                    )}
                  >
                    {g.minSelect >= 1 ? 'Obrigatório' : 'Opcional'}
                    {g.maxSelect > 1 && ` • até ${g.maxSelect}`}
                  </span>
                </legend>

                <div className="mt-2 space-y-1.5">
                  {g.options.map((o) => {
                    const checked = selectedSet.has(o.id)
                    const bloqueada = !o.isAvailable
                    // No teto do grupo, o que não está marcado fica inerte —
                    // menos frustrante que deixar clicar e não acontecer nada.
                    const inerte = bloqueada || (!checked && noTeto && g.maxSelect > 1)
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                          checked
                            ? 'border-accent bg-green-50/60'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50',
                          inerte && 'cursor-not-allowed opacity-50 hover:bg-white',
                        )}
                      >
                        <input
                          type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                          name={`grupo-${g.id}`}
                          checked={checked}
                          disabled={inerte}
                          onChange={() => toggle(g, o.id)}
                          className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="min-w-0 flex-1 text-sm text-neutral-800">
                          {o.name}
                          {bloqueada && (
                            <span className="ml-2 text-xs text-neutral-400">(esgotado)</span>
                          )}
                        </span>
                        {o.priceDelta !== 0 && (
                          <span className="shrink-0 text-sm font-medium text-accent">
                            {o.priceDelta > 0 ? '+' : '−'} {formatBRL(Math.abs(o.priceDelta))}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}

          <div>
            <label
              htmlFor="obs"
              className="mb-1.5 block text-sm font-semibold text-neutral-900"
            >
              Alguma observação?
            </label>
            <textarea
              id="obs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={140}
              placeholder="Ex.: caprichar no molho, ponto da carne bem passado"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      )}
    </Sheet>
  )
}
