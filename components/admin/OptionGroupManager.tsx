'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Pencil, Check, X, ListPlus, PackageX, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBRL } from '@/lib/format'
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  createOptionAction,
  updateOptionAction,
  deleteOptionAction,
  setOptionAvailabilityAction,
} from '@/app/painel/_actions/option-groups'

export type AdminOption = {
  id: string
  name: string
  priceDelta: number
  defaultSelected: boolean
  isAvailable: boolean
}

export type AdminGroup = {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  options: AdminOption[]
  productCount: number
}

/** Descreve a regra do grupo em português, para o dono não precisar decifrar min/max. */
function groupRule(g: { minSelect: number; maxSelect: number }): string {
  if (g.maxSelect === 1) {
    return g.minSelect >= 1 ? 'Escolha 1 (obrigatório)' : 'Escolha até 1 (opcional)'
  }
  if (g.minSelect >= 1) return `Escolha de ${g.minSelect} a ${g.maxSelect}`
  return `Escolha até ${g.maxSelect} (opcional)`
}

export function OptionGroupManager({ initial }: { initial: AdminGroup[] }) {
  const [groups, setGroups] = useState<AdminGroup[]>(initial)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [, startTransition] = useTransition()

  function patch(groupId: string, fn: (g: AdminGroup) => AdminGroup) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? fn(g) : g)))
  }

  function addGroup() {
    const name = newName.trim()
    if (!name) return
    setError(undefined)
    startTransition(async () => {
      const res = await createGroupAction({ name, minSelect: 0, maxSelect: 1 })
      if (res.ok) {
        setGroups((prev) => [...prev, res.group])
        setNewName('')
      } else {
        setError(res.error)
      }
    })
  }

  function removeGroup(g: AdminGroup) {
    const usado = g.productCount > 0 ? ` Ele está em ${g.productCount} item(ns) do cardápio.` : ''
    if (!confirm(`Excluir o grupo "${g.name}" e suas opções?${usado}`)) return
    setGroups((prev) => prev.filter((x) => x.id !== g.id))
    startTransition(async () => {
      await deleteGroupAction(g.id)
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            placeholder="Novo grupo (ex.: Adicionais)"
            aria-label="Nome do novo grupo"
          />
          <Button onClick={addGroup}>
            <Plus className="h-4 w-4" /> Criar grupo
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <ListPlus className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-medium text-neutral-700">Nenhum grupo ainda</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Um grupo reúne escolhas de um item: <strong>Adicionais</strong> (bacon, ovo),{' '}
            <strong>Vem com</strong> (alface, cebola — o cliente pode tirar) ou{' '}
            <strong>Ponto da carne</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onPatch={(fn) => patch(g.id, fn)}
              onRemove={() => removeGroup(g)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({
  group,
  onPatch,
  onRemove,
}: {
  group: AdminGroup
  onPatch: (fn: (g: AdminGroup) => AdminGroup) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: group.name,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
  })
  const [optName, setOptName] = useState('')
  const [optPrice, setOptPrice] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [, startTransition] = useTransition()

  function saveGroup() {
    setError(undefined)
    const input = {
      name: draft.name.trim(),
      minSelect: Number(draft.minSelect),
      maxSelect: Number(draft.maxSelect),
    }
    startTransition(async () => {
      const res = await updateGroupAction(group.id, input)
      if (res.ok) {
        onPatch((g) => ({ ...g, ...input }))
        setEditing(false)
      } else {
        setError(res.error)
      }
    })
  }

  function addOption() {
    const name = optName.trim()
    if (!name) return
    setError(undefined)
    const priceDelta = Number(optPrice.replace(',', '.')) || 0
    startTransition(async () => {
      const res = await createOptionAction(group.id, { name, priceDelta, defaultSelected: false })
      if (res.ok) {
        onPatch((g) => ({ ...g, options: [...g.options, res.option] }))
        setOptName('')
        setOptPrice('')
      } else {
        setError(res.error)
      }
    })
  }

  function toggleDefault(o: AdminOption) {
    const next = !o.defaultSelected
    onPatch((g) => ({
      ...g,
      options: g.options.map((x) => (x.id === o.id ? { ...x, defaultSelected: next } : x)),
    }))
    startTransition(async () => {
      await updateOptionAction(o.id, {
        name: o.name,
        priceDelta: o.priceDelta,
        defaultSelected: next,
      })
    })
  }

  function toggleAvailable(o: AdminOption) {
    const next = !o.isAvailable
    onPatch((g) => ({
      ...g,
      options: g.options.map((x) => (x.id === o.id ? { ...x, isAvailable: next } : x)),
    }))
    startTransition(async () => {
      await setOptionAvailabilityAction(o.id, next)
    })
  }

  function removeOption(o: AdminOption) {
    onPatch((g) => ({ ...g, options: g.options.filter((x) => x.id !== o.id) }))
    startTransition(async () => {
      await deleteOptionAction(o.id)
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
      {/* Cabeçalho do grupo */}
      <div className="flex items-start gap-2 border-b border-neutral-100 p-4">
        {editing ? (
          <div className="flex-1 space-y-3">
            <Input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="h-9"
              aria-label="Nome do grupo"
            />
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-neutral-500">
                Mínimo
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={draft.minSelect}
                  onChange={(e) => setDraft((d) => ({ ...d, minSelect: Number(e.target.value) }))}
                  className="mt-1 h-9 w-20"
                />
              </label>
              <label className="text-xs text-neutral-500">
                Máximo
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.maxSelect}
                  onChange={(e) => setDraft((d) => ({ ...d, maxSelect: Number(e.target.value) }))}
                  className="mt-1 h-9 w-20"
                />
              </label>
              <p className="pb-2 text-xs text-neutral-400">
                Mínimo 1 torna a escolha obrigatória.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveGroup} size="sm">
                <Check className="h-4 w-4" /> Salvar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-900">{group.name}</p>
              <p className="text-xs text-neutral-500">
                {groupRule(group)}
                {group.productCount > 0 && ` • em ${group.productCount} item(ns)`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft({
                  name: group.name,
                  minSelect: group.minSelect,
                  maxSelect: group.maxSelect,
                })
                setEditing(true)
              }}
              aria-label={`Editar grupo ${group.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Excluir grupo ${group.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Opções */}
      <ul className="divide-y divide-neutral-100">
        {group.options.map((o) => (
          <li key={o.id} className="flex items-center gap-2 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p
                className={
                  o.isAvailable
                    ? 'text-sm text-neutral-800'
                    : 'text-sm text-neutral-400 line-through'
                }
              >
                {o.name}
                {o.priceDelta !== 0 && (
                  <span className="ml-2 text-xs font-medium text-accent">
                    {o.priceDelta > 0 ? '+' : '−'} {formatBRL(Math.abs(o.priceDelta))}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleDefault(o)}
              className={
                o.defaultSelected
                  ? 'rounded-lg bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700'
                  : 'rounded-lg px-2 py-1 text-[11px] font-medium text-neutral-400 hover:bg-neutral-100'
              }
              title="Já vem marcada no item — o cliente pode desmarcar para tirar"
            >
              vem com
            </button>
            <button
              type="button"
              onClick={() => toggleAvailable(o)}
              aria-label={o.isAvailable ? `Esgotar ${o.name}` : `Reativar ${o.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
            >
              {o.isAvailable ? (
                <PackageCheck className="h-4 w-4" />
              ) : (
                <PackageX className="h-4 w-4 text-red-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => removeOption(o)}
              aria-label={`Excluir ${o.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {/* Nova opção */}
      <div className="flex flex-wrap gap-2 bg-neutral-50 p-3">
        <Input
          value={optName}
          onChange={(e) => setOptName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
          placeholder="Nova opção (ex.: Bacon)"
          aria-label={`Nova opção em ${group.name}`}
          className="h-9 min-w-40 flex-1"
        />
        <Input
          value={optPrice}
          onChange={(e) => setOptPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
          inputMode="decimal"
          placeholder="R$ 0,00"
          aria-label="Acréscimo no preço"
          className="h-9 w-28"
        />
        <Button variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
