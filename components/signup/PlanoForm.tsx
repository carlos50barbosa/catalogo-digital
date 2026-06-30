'use client'

import { useActionState, useState } from 'react'
import { Check, Star, AlertCircle, CreditCard } from 'lucide-react'
import { choosePlanAction } from '@/app/cadastro/plano/actions'
import { initialActionState } from '@/lib/action-state'
import { PLANS, ORDERED_PLANS, planFeatures } from '@/lib/plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

const BILLING = [
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CREDIT_CARD', label: 'Cartão' },
] as const

export function PlanoForm() {
  const [state, formAction, pending] = useActionState(choosePlanAction, initialActionState)
  const [plan, setPlan] = useState<string>('PROFISSIONAL')
  const [billing, setBilling] = useState<string>('PIX')

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      {/* Planos */}
      <div className="grid gap-3 md:grid-cols-3">
        {ORDERED_PLANS.map((p) => {
          const f = planFeatures(p)
          const selected = plan === p
          return (
            <label
              key={p}
              className={cn(
                'relative cursor-pointer rounded-2xl border bg-white p-5 shadow-soft transition',
                selected ? 'border-accent ring-2 ring-accent' : 'border-neutral-200 hover:border-neutral-300',
              )}
            >
              <input
                type="radio"
                name="plan"
                value={p}
                checked={selected}
                onChange={() => setPlan(p)}
                className="sr-only"
              />
              {f.customBranding === 'full' && p === 'PROFISSIONAL' && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">
                  <Star className="h-3 w-3" /> Popular
                </span>
              )}
              <p className="font-display text-lg font-extrabold text-neutral-900">{f.label}</p>
              <p className="mt-1 font-semibold text-accent">
                {formatBRL(f.value)}
                <span className="text-xs font-normal text-neutral-400">/mês</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">{f.resumo}</p>
              <ul className="mt-3 space-y-1.5">
                <li className="flex items-center gap-1.5 text-xs text-neutral-700">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  {f.maxProducts === null ? 'Produtos ilimitados' : `Até ${f.maxProducts} produtos`}
                </li>
                {f.ofertasEnabled && (
                  <li className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <Check className="h-3.5 w-3.5 text-green-600" /> Seção de ofertas
                  </li>
                )}
                {f.prioritySupport && (
                  <li className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <Check className="h-3.5 w-3.5 text-green-600" /> Suporte prioritário
                  </li>
                )}
                {f.managedContent && (
                  <li className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <Check className="h-3.5 w-3.5 text-green-600" /> Conteúdo feito pra você
                  </li>
                )}
              </ul>
            </label>
          )
        })}
      </div>
      <FieldError message={state.fieldErrors?.plan} />

      {/* Forma de pagamento */}
      <div>
        <Label>Forma de pagamento</Label>
        <div className="grid grid-cols-3 gap-2">
          {BILLING.map((b) => (
            <label
              key={b.value}
              className={cn(
                'flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium',
                billing === b.value
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
              )}
            >
              <input
                type="radio"
                name="billingType"
                value={b.value}
                checked={billing === b.value}
                onChange={() => setBilling(b.value)}
                className="sr-only"
              />
              {b.label}
            </label>
          ))}
        </div>
      </div>

      {/* CPF/CNPJ */}
      <div>
        <Label htmlFor="cpfCnpj">CPF ou CNPJ do responsável</Label>
        <Input id="cpfCnpj" name="cpfCnpj" inputMode="numeric" required placeholder="Somente números" />
        <FieldError message={state.fieldErrors?.cpfCnpj} />
        <p className="mt-1 text-xs text-neutral-400">Necessário para emitir a cobrança no Asaas.</p>
      </div>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        <CreditCard className="h-5 w-5" /> Ir para o pagamento
      </Button>
      <p className="text-center text-xs text-neutral-400">
        Você será levado à página de pagamento segura do Asaas. Não guardamos dados de cartão.
      </p>
    </form>
  )
}
