'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Trash2, CreditCard, Boxes, CalendarClock } from 'lucide-react'
import {
  overrideStatusAction,
  changePlanAction,
  createSubscriptionAction,
  cancelSubscriptionAction,
} from '@/app/admin-plataforma/actions'
import { STATUS_LABELS } from '@/lib/store-status'
import { PLANS, ORDERED_PLANS } from '@/lib/plans'
import { formatBRL, formatDateTimeBR } from '@/lib/format'
import { cn } from '@/lib/utils'

export type PlatformRow = {
  id: string
  name: string
  slug: string
  plan: 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM'
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED'
  productCount: number
  ownerEmail: string | null
  createdAt: string
  nextDueDate: string | null
  subValue: number | null
  hasSubscription: boolean
}

const STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'] as const

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'ACTIVE', label: 'Ativas' },
  { id: 'PAST_DUE', label: 'Em atraso' },
  { id: 'SUSPENDED', label: 'Suspensas' },
  { id: 'CANCELED', label: 'Canceladas' },
]

function statusTone(s: PlatformRow['status']): string {
  switch (s) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-700'
    case 'TRIALING':
      return 'bg-blue-100 text-blue-700'
    case 'PAST_DUE':
      return 'bg-amber-100 text-amber-700'
    case 'SUSPENDED':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-neutral-100 text-neutral-600'
  }
}

const selectCls =
  'h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm focus:border-accent focus:outline-none'

export function PlatformTable({ rows }: { rows: PlatformRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [pending, startTransition] = useTransition()

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok && res.error) alert(res.error)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium',
              filter === f.id
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100',
            )}
          >
            {f.label}
          </button>
        ))}
        {pending && <span className="self-center text-xs text-neutral-400">salvando...</span>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">
          Nenhuma loja neste filtro.
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-neutral-900">{r.name}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusTone(r.status))}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    /{r.slug}
                    {r.ownerEmail ? ` · ${r.ownerEmail}` : ''}
                  </p>
                </div>
                <a
                  href={`/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> ver loja
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Boxes className="h-3.5 w-3.5" /> {r.productCount} produtos
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  {r.subValue !== null ? formatBRL(r.subValue) : 'sem assinatura'}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {r.nextDueDate ? formatDateTimeBR(r.nextDueDate) : '—'}
                </span>
              </div>

              {/* Controles */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                  Plano
                  <select
                    className={selectCls}
                    value={r.plan}
                    onChange={(e) => run(() => changePlanAction(r.id, e.target.value))}
                  >
                    {ORDERED_PLANS.map((p) => (
                      <option key={p} value={p}>
                        {PLANS[p].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                  Status
                  <select
                    className={selectCls}
                    value={r.status}
                    onChange={(e) => run(() => overrideStatusAction(r.id, e.target.value))}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>

                {!r.hasSubscription && (
                  <button
                    type="button"
                    onClick={() => {
                      const doc = prompt(
                        'CPF/CNPJ do responsável (obrigatório para cobrar no Asaas).\nDeixe em branco para criar só localmente:',
                      )
                      run(() => createSubscriptionAction(r.id, r.plan, 'PIX', doc ?? undefined))
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg hover:opacity-90"
                  >
                    <CreditCard className="h-4 w-4" /> Criar assinatura
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Cancelar a assinatura de "${r.name}"? A loja vai para CANCELED.`))
                      run(() => cancelSubscriptionAction(r.id))
                  }}
                  className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Cancelar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
