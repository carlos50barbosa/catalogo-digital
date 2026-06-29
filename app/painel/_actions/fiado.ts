'use server'

import { revalidatePath } from 'next/cache'
import { requireStore } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/format'
import { getOrder } from '@/lib/data/orders'
import {
  getFiadoAccess,
  getFiadoAccountByCustomer,
  getFiadoEntry,
  getFiadoEntryByOrder,
  isEntryReversed,
  postFiadoEntry,
  updateFiadoCreditLimit,
  setFiadoAccountStatus,
  updateFiadoSettings,
} from '@/lib/data/fiado'
import {
  fiadoDebitSchema,
  fiadoPaymentSchema,
  fiadoAccountSchema,
  fiadoSettingsSchema,
  fieldErrors,
} from '@/lib/validation'
import { emptyToNull, type ActionState } from '@/lib/action-state'

// Resultado das ações de lançamento (com fluxo de confirmação de aviso).
export type FiadoActionResult =
  | { ok: true; balance: number }
  | { ok: false; error: string }
  | { ok: false; needsConfirm: 'limit' | 'overpay'; message: string }

const PLAN_GATE = 'O controle de fiado está disponível no plano Profissional.'
const STORE_OFF = 'O fiado está desativado nas configurações da loja.'

/** Gate de acesso (plano + toggle da loja). Retorna a mensagem certa quando bloqueado. */
async function gate(storeId: string) {
  const access = await getFiadoAccess(storeId)
  if (access.available) return { ok: true as const, access }
  return { ok: false as const, error: access.planAllows ? STORE_OFF : PLAN_GATE }
}

function resolveDueDate(raw: string | null | undefined, termDays: number): Date {
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d
  }
  const n = new Date()
  const due = new Date(n.getFullYear(), n.getMonth(), n.getDate())
  due.setDate(due.getDate() + termDays)
  return due
}

function revalidateFiado(customerId?: string) {
  revalidatePath('/painel/fiado')
  if (customerId) revalidatePath(`/painel/fiado/${customerId}`)
}

// ---------- Lançar compra (DEBIT) ----------

export async function launchDebitAction(input: unknown): Promise<FiadoActionResult> {
  const { storeId, userId } = await requireStore()
  const g = await gate(storeId)
  if (!g.ok) return { ok: false, error: g.error }

  const parsed = fiadoDebitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const data = parsed.data
  const termDays = g.access.settings?.fiadoDefaultTermDays ?? 30
  const defaultCreditLimit = g.access.settings
    ? decimalToNumber(g.access.settings.fiadoDefaultCreditLimit)
    : 0

  const res = await postFiadoEntry(
    storeId,
    {
      customerId: data.customerId,
      type: 'DEBIT',
      amount: data.amount,
      description: data.description?.trim() || null,
      dueDate: resolveDueDate(data.dueDate, termDays),
      createdByUserId: userId,
    },
    { force: data.confirm === true, defaultCreditLimit },
  )

  if (res.ok) {
    revalidateFiado(data.customerId)
    return { ok: true, balance: res.balance }
  }
  if (res.reason === 'blocked') {
    return { ok: false, error: 'Conta bloqueada. Desbloqueie para lançar novas compras.' }
  }
  if (res.reason === 'limit') {
    return {
      ok: false,
      needsConfirm: 'limit',
      message: 'Este lançamento ultrapassa o limite de crédito do cliente. Lançar mesmo assim?',
    }
  }
  return { ok: false, error: 'Cliente não encontrado.' }
}

// ---------- Registrar pagamento (CREDIT) ----------

export async function launchPaymentAction(input: unknown): Promise<FiadoActionResult> {
  const { storeId, userId } = await requireStore()
  const g = await gate(storeId)
  if (!g.ok) return { ok: false, error: g.error }

  const parsed = fiadoPaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const data = parsed.data

  const res = await postFiadoEntry(
    storeId,
    {
      customerId: data.customerId,
      type: 'CREDIT',
      amount: data.amount,
      description: data.description?.trim() || null,
      createdByUserId: userId,
    },
    { force: data.confirm === true },
  )

  if (res.ok) {
    revalidateFiado(data.customerId)
    return { ok: true, balance: res.balance }
  }
  if (res.reason === 'overpay') {
    return {
      ok: false,
      needsConfirm: 'overpay',
      message:
        'O pagamento é maior que a dívida — o cliente ficará com saldo a favor. Confirmar?',
    }
  }
  return { ok: false, error: 'Cliente não encontrado.' }
}

// ---------- Estorno (cria lançamento oposto referenciando o original) ----------

export async function reverseEntryAction(entryId: string): Promise<FiadoActionResult> {
  const { storeId, userId } = await requireStore()
  const g = await gate(storeId)
  if (!g.ok) return { ok: false, error: g.error }

  const entry = await getFiadoEntry(storeId, entryId)
  if (!entry) return { ok: false, error: 'Lançamento não encontrado.' }
  if (entry.reversesEntryId) {
    return { ok: false, error: 'Não é possível estornar um estorno.' }
  }
  if (await isEntryReversed(storeId, entryId)) {
    return { ok: false, error: 'Este lançamento já foi estornado.' }
  }

  const opposite = entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT'
  const what = entry.type === 'DEBIT' ? 'compra' : 'pagamento'
  const res = await postFiadoEntry(
    storeId,
    {
      customerId: entry.customerId,
      type: opposite,
      amount: decimalToNumber(entry.amount),
      description: `Estorno de ${what}${entry.description ? `: ${entry.description}` : ''}`,
      reversesEntryId: entry.id,
      createdByUserId: userId,
    },
    { force: true }, // estorno nunca é bloqueado por limite/excesso
  )

  if (res.ok) {
    revalidateFiado(entry.customerId)
    return { ok: true, balance: res.balance }
  }
  return { ok: false, error: 'Não foi possível estornar.' }
}

// ---------- Editar limite de crédito ----------

export async function updateCreditLimitAction(input: unknown): Promise<FiadoActionResult> {
  const { storeId } = await requireStore()
  const g = await gate(storeId)
  if (!g.ok) return { ok: false, error: g.error }

  const parsed = fiadoAccountSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const ok = await updateFiadoCreditLimit(storeId, parsed.data.customerId, parsed.data.creditLimit)
  if (!ok) return { ok: false, error: 'Cliente não encontrado.' }
  revalidateFiado(parsed.data.customerId)
  return { ok: true, balance: 0 }
}

// ---------- Bloquear / desbloquear ----------

export async function toggleBlockAction(customerId: string): Promise<FiadoActionResult> {
  const { storeId } = await requireStore()
  const g = await gate(storeId)
  if (!g.ok) return { ok: false, error: g.error }

  const account = await getFiadoAccountByCustomer(storeId, customerId)
  const next = account?.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'
  const defaultCreditLimit = g.access.settings
    ? decimalToNumber(g.access.settings.fiadoDefaultCreditLimit)
    : 0
  const ok = await setFiadoAccountStatus(storeId, customerId, next, defaultCreditLimit)
  if (!ok) return { ok: false, error: 'Cliente não encontrado.' }
  revalidateFiado(customerId)
  return { ok: true, balance: account ? decimalToNumber(account.balance) : 0 }
}

// ---------- Lançar um PEDIDO na conta (integração) ----------

export async function launchFromOrderAction(orderId: string): Promise<FiadoActionResult> {
  const { storeId, userId } = await requireStore()
  const g = await gate(storeId)
  if (!g.ok) return { ok: false, error: g.error }

  const order = await getOrder(storeId, orderId)
  if (!order) return { ok: false, error: 'Pedido não encontrado.' }
  if (!order.customerId) {
    return { ok: false, error: 'Este pedido não tem cliente vinculado para lançar no fiado.' }
  }
  const existing = await getFiadoEntryByOrder(storeId, orderId)
  if (existing) return { ok: false, error: 'Este pedido já foi lançado na conta.' }

  const termDays = g.access.settings?.fiadoDefaultTermDays ?? 30
  const defaultCreditLimit = g.access.settings
    ? decimalToNumber(g.access.settings.fiadoDefaultCreditLimit)
    : 0
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(order.createdAt)

  const res = await postFiadoEntry(
    storeId,
    {
      customerId: order.customerId,
      type: 'DEBIT',
      amount: decimalToNumber(order.total),
      description: `Pedido de ${dateLabel}`,
      orderId: order.id,
      dueDate: resolveDueDate(null, termDays),
      createdByUserId: userId,
    },
    { force: true, defaultCreditLimit }, // registra a compra real (não bloqueia por limite)
  )

  if (res.ok) {
    revalidateFiado(order.customerId)
    revalidatePath(`/painel/pedidos/${orderId}`)
    return { ok: true, balance: res.balance }
  }
  return { ok: false, error: 'Não foi possível lançar o pedido na conta.' }
}

// ---------- Configurações de fiado (form) ----------

export async function updateFiadoSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { storeId } = await requireStore()
  const access = await getFiadoAccess(storeId)
  if (!access.planAllows) return { error: PLAN_GATE }

  const parsed = fiadoSettingsSchema.safeParse({
    fiadoEnabled: formData.get('fiadoEnabled') === 'on',
    fiadoDefaultTermDays: formData.get('fiadoDefaultTermDays'),
    fiadoDefaultCreditLimit: formData.get('fiadoDefaultCreditLimit'),
    fiadoReminderTemplate: emptyToNull(formData.get('fiadoReminderTemplate')),
  })
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  await updateFiadoSettings(storeId, {
    fiadoEnabled: parsed.data.fiadoEnabled ?? true,
    fiadoDefaultTermDays: parsed.data.fiadoDefaultTermDays,
    fiadoDefaultCreditLimit: parsed.data.fiadoDefaultCreditLimit,
    fiadoReminderTemplate: parsed.data.fiadoReminderTemplate ?? null,
  })

  revalidatePath('/painel/fiado/configuracoes')
  revalidatePath('/painel/fiado')
  return { ok: true, message: 'Configurações de fiado salvas!' }
}
