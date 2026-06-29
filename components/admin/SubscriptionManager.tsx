'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, ArrowUpDown, Ban } from 'lucide-react'
import { ORDERED_PLANS, PLANS } from '@/lib/plans'
import {
  changePlanSelfAction,
  cancelSubscriptionSelfAction,
  updatePaymentAction,
} from '@/app/painel/_actions/subscription'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

type Plan = 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM'

export function SubscriptionManager({
  currentPlan,
  hasSubscription,
}: {
  currentPlan: Plan
  hasSubscription: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: string } | void>) {
    startTransition(async () => {
      setError(null)
      const res = await fn()
      if (res && !res.ok) setError(res.error ?? 'Algo deu errado.')
      else router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700">
        <ArrowUpDown className="h-4 w-4 text-neutral-400" /> Gerenciar assinatura
      </p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Mudar de plano */}
      <div className="grid gap-2 sm:grid-cols-3">
        {ORDERED_PLANS.map((p) => {
          const f = PLANS[p]
          const current = p === currentPlan
          return (
            <button
              key={p}
              type="button"
              disabled={current || pending}
              onClick={() => run(() => changePlanSelfAction(p))}
              className={cn(
                'rounded-xl border p-3 text-left transition disabled:cursor-default',
                current
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-neutral-200 hover:border-neutral-300',
              )}
            >
              <p className="font-display font-bold text-neutral-900">{f.label}</p>
              <p className="text-sm text-accent">{formatBRL(f.value)}<span className="text-xs text-neutral-400">/mês</span></p>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                {current ? 'Plano atual' : 'Mudar para este'}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {hasSubscription && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => updatePaymentAction())}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" /> Atualizar forma de pagamento
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                'Cancelar a assinatura? Sua loja sairá do ar. Esta ação encerra a cobrança no gateway.',
              )
            )
              run(() => cancelSubscriptionSelfAction())
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Ban className="h-4 w-4" /> Cancelar assinatura
        </button>
      </div>
    </div>
  )
}
