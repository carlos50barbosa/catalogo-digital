'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MessageCircle, ChevronRight, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/format'
import { buildFiadoReminderMessage, buildFiadoReminderUrl } from '@/lib/fiado/buildReminderMessage'
import type { FiadoDebtor } from '@/lib/types'

type Sort = 'balance' | 'overdue'

export function FiadoDebtorList({
  debtors,
  storeName,
  reminderTemplate,
}: {
  debtors: FiadoDebtor[]
  storeName: string
  reminderTemplate: string | null
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('balance')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? debtors.filter(
          (d) => d.customerName.toLowerCase().includes(q) || d.customerPhone.includes(q),
        )
      : debtors
    const sorted = [...filtered].sort((a, b) =>
      sort === 'overdue' ? b.daysOverdue - a.daysOverdue || b.balance - a.balance : b.balance - a.balance,
    )
    return sorted
  }, [debtors, query, sort])

  if (debtors.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
        <p className="font-medium text-neutral-700">Ninguém devendo 🎉</p>
        <p className="mt-1 text-sm text-neutral-500">
          Lance uma compra fiada pela ficha do cliente (em Clientes) ou pelo detalhe de um pedido.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            aria-label="Buscar devedor"
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex rounded-xl border border-neutral-300 bg-white p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setSort('balance')}
            className={`rounded-lg px-3 py-1.5 font-medium ${sort === 'balance' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >
            Maior saldo
          </button>
          <button
            type="button"
            onClick={() => setSort('overdue')}
            className={`rounded-lg px-3 py-1.5 font-medium ${sort === 'overdue' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >
            Mais atrasado
          </button>
        </div>
      </div>

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        {rows.map((d) => {
          const url = buildFiadoReminderUrl(
            d.customerPhone,
            buildFiadoReminderMessage({
              customerName: d.customerName,
              storeName,
              balance: d.balance,
              template: reminderTemplate,
            }),
          )
          return (
            <li key={d.accountId} className="flex items-center gap-3 p-4">
              <Link href={`/painel/fiado/${d.customerId}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium text-neutral-900">
                  {d.customerName}
                  {d.status === 'BLOCKED' && (
                    <Lock className="h-3.5 w-3.5 text-red-500" aria-label="Bloqueado" />
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{d.customerPhone}</span>
                  {d.isOverdue && (
                    <Badge tone="danger" className="px-1.5 py-0">
                      {d.daysOverdue} {d.daysOverdue === 1 ? 'dia' : 'dias'} em atraso
                    </Badge>
                  )}
                </p>
              </Link>
              <div className="text-right">
                <p className="font-display font-bold text-red-600">{formatBRL(d.balance)}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Cobrar ${d.customerName} no WhatsApp`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <Link
                href={`/painel/fiado/${d.customerId}`}
                aria-label={`Abrir ficha de ${d.customerName}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
