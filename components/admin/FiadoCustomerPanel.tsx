'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  MessageCircle,
  Pencil,
  Lock,
  Unlock,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/format'
import {
  launchDebitAction,
  launchPaymentAction,
  updateCreditLimitAction,
  toggleBlockAction,
  type FiadoActionResult,
} from '@/app/painel/_actions/fiado'
import type { FiadoAccountStatus } from '@/lib/types'

type Form = 'debit' | 'payment' | 'limit' | null

export function FiadoCustomerPanel({
  customerId,
  balance,
  creditLimit,
  status,
  reminderUrl,
}: {
  customerId: string
  balance: number
  creditLimit: number
  status: FiadoAccountStatus
  reminderUrl: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<Form>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [limit, setLimit] = useState(String(creditLimit || ''))
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ message: string; retry: () => void } | null>(null)

  const blocked = status === 'BLOCKED'

  function reset() {
    setForm(null)
    setAmount('')
    setDescription('')
    setDueDate('')
    setError(null)
    setConfirm(null)
  }

  // Trata o resultado final (ok/erro). O caso needsConfirm é interceptado nas funções run*.
  function handle(res: FiadoActionResult, onOk: () => void) {
    if (res.ok) {
      onOk()
      router.refresh()
    } else if (!('needsConfirm' in res)) {
      setError(res.error)
    }
  }

  function runDebit(confirmFlag = false) {
    setError(null)
    const value = Number(amount.replace(',', '.'))
    startTransition(async () => {
      const res = await launchDebitAction({
        customerId,
        amount: value,
        description: description || null,
        dueDate: dueDate || null,
        confirm: confirmFlag,
      })
      if (!res.ok && 'needsConfirm' in res) {
        setConfirm({ message: res.message, retry: () => runDebit(true) })
        return
      }
      handle(res, reset)
    })
  }

  function runPayment(confirmFlag = false) {
    setError(null)
    const value = Number(amount.replace(',', '.'))
    startTransition(async () => {
      const res = await launchPaymentAction({
        customerId,
        amount: value,
        description: description || null,
        confirm: confirmFlag,
      })
      if (!res.ok && 'needsConfirm' in res) {
        setConfirm({ message: res.message, retry: () => runPayment(true) })
        return
      }
      handle(res, reset)
    })
  }

  function runLimit() {
    setError(null)
    const value = Number(limit.replace(',', '.')) || 0
    startTransition(async () => {
      const res = await updateCreditLimitAction({ customerId, creditLimit: value })
      handle(res, reset)
    })
  }

  function runToggleBlock() {
    if (!blocked && !window.confirm('Bloquear este cliente para novas compras fiadas?')) return
    setError(null)
    startTransition(async () => {
      const res = await toggleBlockAction(customerId)
      if (res.ok) router.refresh()
      else if (!('needsConfirm' in res)) setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      {/* Resumo da conta */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Saldo em aberto
            </p>
            <p
              className={`font-display text-3xl font-bold ${
                balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-neutral-900'
              }`}
            >
              {formatBRL(balance)}
            </p>
            {balance < 0 && (
              <p className="text-xs text-green-600">Cliente tem saldo a favor.</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone={blocked ? 'danger' : 'success'}>{blocked ? 'Bloqueado' : 'Ativo'}</Badge>
            <p className="text-xs text-neutral-500">
              Limite: {creditLimit > 0 ? formatBRL(creditLimit) : 'sem limite'}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { reset(); setForm('debit') }}>
            <ArrowUpCircle className="h-4 w-4" /> Lançar compra
          </Button>
          <Button size="sm" variant="outline" onClick={() => { reset(); setForm('payment') }}>
            <ArrowDownCircle className="h-4 w-4" /> Registrar pagamento
          </Button>
          {balance > 0 && (
            <a
              href={reminderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" /> Cobrar no WhatsApp
            </a>
          )}
          <Button size="sm" variant="outline" onClick={() => { reset(); setForm('limit') }}>
            <Pencil className="h-4 w-4" /> Editar limite
          </Button>
          <Button size="sm" variant="ghost" onClick={runToggleBlock} loading={pending}>
            {blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {blocked ? 'Desbloquear' : 'Bloquear'}
          </Button>
        </div>
      </div>

      {/* Formulário inline (débito / pagamento / limite) */}
      {form && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-neutral-900">
              {form === 'debit' && 'Lançar compra (fiado)'}
              {form === 'payment' && 'Registrar pagamento'}
              {form === 'limit' && 'Editar limite de crédito'}
            </p>
            <button type="button" onClick={reset} aria-label="Fechar" className="text-neutral-400 hover:text-neutral-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          {confirm ? (
            <div className="space-y-3">
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {confirm.message}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { const r = confirm.retry; setConfirm(null); r() }} loading={pending}>
                  Confirmar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {form !== 'limit' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Valor (R$)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Descrição (opcional)
                    </label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={form === 'debit' ? 'Ex.: compras da semana' : 'Ex.: pagamento parcial'}
                      maxLength={200}
                    />
                  </div>
                  {form === 'debit' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-500">
                        Vencimento (opcional — usa o prazo padrão se vazio)
                      </label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  )}
                </>
              )}
              {form === 'limit' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Limite de crédito (R$) — 0 = sem limite
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="0,00"
                    autoFocus
                  />
                </div>
              )}

              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <Button
                onClick={() => {
                  if (form === 'debit') runDebit()
                  else if (form === 'payment') runPayment()
                  else runLimit()
                }}
                loading={pending}
              >
                {form === 'debit' && 'Lançar compra'}
                {form === 'payment' && 'Registrar pagamento'}
                {form === 'limit' && 'Salvar limite'}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && !form && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
