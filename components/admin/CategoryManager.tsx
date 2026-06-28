'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from '@/app/painel/_actions/categories'

type Cat = { id: string; name: string; sortOrder: number }

export function CategoryManager({ initial }: { initial: Cat[] }) {
  const [cats, setCats] = useState<Cat[]>(initial)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [, startTransition] = useTransition()

  function add() {
    const name = newName.trim()
    if (!name) return
    setError(undefined)
    startTransition(async () => {
      const res = await createCategoryAction(name)
      if (res.ok && res.category) {
        setCats((prev) => [...prev, res.category])
        setNewName('')
      } else {
        setError(res.error ?? 'Não foi possível criar.')
      }
    })
  }

  function saveRename(id: string) {
    const name = draft.trim()
    setEditingId(null)
    if (!name) return
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    startTransition(async () => {
      await renameCategoryAction(id, name)
    })
  }

  function remove(c: Cat) {
    if (!confirm(`Excluir a categoria "${c.name}"? Os produtos ficarão sem categoria.`)) return
    setCats((prev) => prev.filter((x) => x.id !== c.id))
    startTransition(async () => {
      await deleteCategoryAction(c.id)
    })
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= cats.length) return
    const next = [...cats]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCats(next)
    startTransition(async () => {
      await reorderCategoriesAction(next.map((c) => c.id))
    })
  }

  return (
    <div className="space-y-4">
      {/* Adicionar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Nova categoria (ex.: Bebidas)"
            aria-label="Nome da nova categoria"
          />
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Lista */}
      {cats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <Tags className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-medium text-neutral-700">Nenhuma categoria ainda</p>
          <p className="text-sm text-neutral-500">Crie categorias para organizar sua vitrine.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          {cats.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 p-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover para cima"
                  className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === cats.length - 1}
                  aria-label="Mover para baixo"
                  className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>

              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(c.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="h-9"
                  />
                  <button
                    type="button"
                    onClick={() => saveRename(c.id)}
                    aria-label="Salvar"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancelar"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-neutral-900">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c.id)
                      setDraft(c.name)
                    }}
                    aria-label={`Renomear ${c.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    aria-label={`Excluir ${c.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
