'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Plus, Search, Check, X } from 'lucide-react'
import { ProductImage } from '@/components/ui/product-image'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { formatBRL, UNIT_LABELS } from '@/lib/format'
import {
  setAvailabilityAction,
  updatePriceAction,
  deleteProductAction,
} from '@/app/painel/_actions/products'
import type { Unit } from '@/lib/types'

export type AdminProduct = {
  id: string
  name: string
  price: number
  unit: Unit
  imageUrl: string | null
  isAvailable: boolean
  categoryName: string | null
}

export function ProductTable({ initial }: { initial: AdminProduct[] }) {
  const [rows, setRows] = useState(initial)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [, startTransition] = useTransition()

  const filtered = query.trim()
    ? rows.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : rows

  function toggleAvailability(id: string, next: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isAvailable: next } : r)))
    startTransition(async () => {
      const res = await setAvailabilityAction(id, next)
      if (!res.ok) {
        // reverte em caso de falha
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isAvailable: !next } : r)))
        toast.error(res.error ?? 'Não foi possível atualizar a disponibilidade.')
      }
    })
  }

  function startEdit(p: AdminProduct) {
    setEditingId(p.id)
    setDraft(String(p.price).replace('.', ','))
  }

  function savePrice(id: string) {
    const value = Number(draft.replace(/\./g, '').replace(',', '.'))
    setEditingId(null)
    if (!Number.isFinite(value) || value < 0) return
    const prevPrice = rows.find((r) => r.id === id)?.price
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, price: value } : r)))
    startTransition(async () => {
      const res = await updatePriceAction(id, value)
      if (res.ok) {
        toast.success('Preço atualizado.')
      } else {
        if (prevPrice !== undefined) {
          setRows((prev) => prev.map((r) => (r.id === id ? { ...r, price: prevPrice } : r)))
        }
        toast.error(res.error ?? 'Não foi possível atualizar o preço.')
      }
    })
  }

  function handleDelete(p: AdminProduct) {
    if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return
    setRows((prev) => prev.filter((r) => r.id !== p.id))
    startTransition(async () => {
      const res = await deleteProductAction(p.id)
      if (res.ok) {
        toast.success(`"${p.name}" excluído.`)
      } else {
        setRows((prev) => [...prev, p]) // restaura em caso de falha
        toast.error(res.error ?? 'Não foi possível excluir o produto.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <Link href="/painel/produtos/novo">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-neutral-700">
            {rows.length === 0 ? 'Nenhum produto cadastrado' : 'Nada encontrado'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length === 0
              ? 'Comece adicionando seu primeiro produto.'
              : 'Tente outro termo de busca.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          {filtered.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <ProductImage
                src={p.imageUrl}
                alt={p.name}
                className="h-14 w-14 shrink-0 rounded-xl"
                iconClassName="h-5 w-5"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.categoryName ?? 'Sem categoria'} · {UNIT_LABELS[p.unit]}
                </p>

                {/* Edição rápida de preço */}
                {editingId === p.id ? (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-sm text-neutral-500">R$</span>
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') savePrice(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      inputMode="decimal"
                      className="h-8 w-24 rounded-lg border border-accent px-2 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => savePrice(p.id)}
                      aria-label="Salvar preço"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                  >
                    {formatBRL(p.price)}
                    <Pencil className="h-3 w-3 text-neutral-400" />
                  </button>
                )}
              </div>

              {/* Disponível / Esgotado (1 toque) */}
              <div className="flex flex-col items-center gap-1">
                <Switch
                  checked={p.isAvailable}
                  onChange={(next) => toggleAvailability(p.id, next)}
                  label={`Disponibilidade de ${p.name}`}
                />
                <span className="text-[10px] font-medium text-neutral-500">
                  {p.isAvailable ? 'Disponível' : 'Esgotado'}
                </span>
              </div>

              <div className="flex items-center">
                <Link
                  href={`/painel/produtos/${p.id}`}
                  aria-label={`Editar ${p.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  aria-label={`Excluir ${p.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
