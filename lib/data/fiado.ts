import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/format'
import { getStoreForPanel } from '@/lib/data/stores'
import { can } from '@/lib/plans'
import type {
  SerializedFiadoEntry,
  FiadoDebtor,
  FiadoOverview,
  FiadoEntryType,
} from '@/lib/types'

/**
 * Repositório do FIADO (caderneta digital) — livro-razão IMUTÁVEL, escopado por storeId.
 *
 * REGRAS DE OURO:
 * - Lançamento (FiadoEntry) é só inserção: nunca editar/excluir. Correção = estorno.
 * - O saldo (FiadoAccount.balance) é um cache atualizado SEMPRE na mesma transação do
 *   lançamento (increment atômico). A fonte da verdade são os lançamentos (recalculável).
 * - Tudo filtrado por storeId; posse de Customer/conta conferida no servidor.
 */

// ---------- Acesso (gating por plano + toggle da loja) ----------

export async function getFiadoAccess(storeId: string) {
  const store = await getStoreForPanel(storeId) // inclui settings
  const planAllows = store ? can(store.plan, 'fiado') : false
  const storeEnabled = store?.settings?.fiadoEnabled ?? true
  return {
    store,
    settings: store?.settings ?? null,
    planAllows,
    storeEnabled,
    available: planAllows && storeEnabled,
  }
}

/** Nº de clientes na caderneta (contas de fiado) da loja — base do limite por plano. */
export function countFiadoAccounts(storeId: string): Promise<number> {
  return prisma.fiadoAccount.count({ where: { storeId } })
}

// ---------- Leitura: conta + extrato ----------

/** Conta de fiado do cliente (ou null), com o Customer. Escopada por storeId. */
export async function getFiadoAccountByCustomer(storeId: string, customerId: string) {
  return prisma.fiadoAccount.findFirst({
    where: { storeId, customerId },
    include: { customer: true },
  })
}

/** Extrato imutável da conta (mais recente primeiro), com flags de estorno e autor. */
export async function listFiadoEntries(
  storeId: string,
  fiadoAccountId: string,
): Promise<SerializedFiadoEntry[]> {
  const entries = await prisma.fiadoEntry.findMany({
    where: { storeId, fiadoAccountId },
    orderBy: { createdAt: 'desc' },
  })
  if (entries.length === 0) return []

  // Quais lançamentos foram estornados (id aparece como reversesEntryId de outro).
  const reversedIds = new Set(
    entries.map((e) => e.reversesEntryId).filter((id): id is string => !!id),
  )

  // Nome de quem lançou (auditoria) — createdByUserId é referência leve, sem FK.
  const userIds = Array.from(new Set(entries.map((e) => e.createdByUserId)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, storeId },
    select: { id: true, name: true },
  })
  const nameById = new Map(users.map((u) => [u.id, u.name]))

  return entries.map((e) => ({
    id: e.id,
    type: e.type as FiadoEntryType,
    amount: decimalToNumber(e.amount),
    description: e.description,
    orderId: e.orderId,
    dueDate: e.dueDate ? e.dueDate.toISOString() : null,
    reversesEntryId: e.reversesEntryId,
    isReversal: !!e.reversesEntryId,
    reversed: reversedIds.has(e.id),
    createdByName: nameById.get(e.createdByUserId) ?? null,
    createdAt: e.createdAt.toISOString(),
  }))
}

/** Recalcula o saldo a partir dos lançamentos (fonte da verdade). Para auditoria/conferência. */
export async function recalcFiadoBalance(storeId: string, fiadoAccountId: string): Promise<number> {
  const grouped = await prisma.fiadoEntry.groupBy({
    by: ['type'],
    where: { storeId, fiadoAccountId },
    _sum: { amount: true },
  })
  let debit = 0
  let credit = 0
  for (const g of grouped) {
    const sum = decimalToNumber(g._sum.amount)
    if (g.type === 'DEBIT') debit = sum
    else credit = sum
  }
  return round2(debit - credit)
}

// ---------- Leitura: devedores + visão geral ----------

function startOfToday(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

/** Devedores (saldo > 0) com dias em atraso pela heurística do débito mais antigo vencido. */
export async function listFiadoDebtors(storeId: string): Promise<FiadoDebtor[]> {
  const accounts = await prisma.fiadoAccount.findMany({
    where: { storeId, balance: { gt: 0 } },
    include: { customer: true },
    orderBy: { balance: 'desc' },
  })
  if (accounts.length === 0) return []

  // Débito mais antigo (com vencimento) por conta → base do "em atraso".
  const oldest = await prisma.fiadoEntry.groupBy({
    by: ['fiadoAccountId'],
    where: {
      storeId,
      type: 'DEBIT',
      dueDate: { not: null },
      fiadoAccountId: { in: accounts.map((a) => a.id) },
    },
    _min: { dueDate: true },
  })
  const oldestDue = new Map(oldest.map((o) => [o.fiadoAccountId, o._min.dueDate]))
  const today = startOfToday()

  return accounts.map((a) => {
    const due = oldestDue.get(a.id) ?? null
    const dueStart = due ? new Date(due.getFullYear(), due.getMonth(), due.getDate()) : null
    const isOverdue = !!dueStart && dueStart < today
    const daysOverdue = isOverdue
      ? Math.floor((today.getTime() - (dueStart as Date).getTime()) / 86_400_000)
      : 0
    return {
      accountId: a.id,
      customerId: a.customerId,
      customerName: a.customer.name,
      customerPhone: a.customer.phone,
      balance: decimalToNumber(a.balance),
      status: a.status as FiadoDebtor['status'],
      daysOverdue,
      isOverdue,
    }
  })
}

/** Indicadores da visão geral, derivados da lista de devedores (sem nova query). */
export function fiadoOverviewFromDebtors(debtors: FiadoDebtor[]): FiadoOverview {
  let totalReceivable = 0
  let totalOverdue = 0
  let overdueCount = 0
  for (const d of debtors) {
    totalReceivable += d.balance
    if (d.isOverdue) {
      totalOverdue += d.balance
      overdueCount++
    }
  }
  return {
    totalReceivable: round2(totalReceivable),
    debtorCount: debtors.length,
    totalOverdue: round2(totalOverdue),
    overdueCount,
  }
}

// ---------- Escrita: lançamento atômico (débito/pagamento/estorno) ----------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export type PostEntryParams = {
  customerId: string
  type: FiadoEntryType
  amount: number // positivo, já arredondado a 2 casas
  description?: string | null
  orderId?: string | null
  dueDate?: Date | null
  reversesEntryId?: string | null
  createdByUserId: string
}

export type PostEntryResult =
  | { ok: true; balance: number; entryId: string }
  | { ok: false; reason: 'not_found' | 'blocked' | 'limit' | 'overpay' | 'customer_limit' }

/**
 * Grava um lançamento e atualiza o saldo na MESMA transação (increment atômico).
 * Cria a conta sob demanda. `force` pula os guards de limite/excesso (usado em estorno
 * e quando o dono confirma o aviso). Retorna 'limit'/'overpay' SEM gravar quando o guard
 * dispara e !force — a action traduz isso em pedido de confirmação ao dono.
 * `maxCustomers` (limite de clientes na caderneta do plano; null = ilimitado) barra a
 * criação de uma conta NOVA quando a loja já atingiu o teto — retorna 'customer_limit'.
 */
export async function postFiadoEntry(
  storeId: string,
  params: PostEntryParams,
  opts: { force?: boolean; defaultCreditLimit?: number; maxCustomers?: number | null } = {},
): Promise<PostEntryResult> {
  const { force = false, defaultCreditLimit = 0, maxCustomers = null } = opts
  const amount = round2(params.amount)

  return prisma.$transaction(async (tx) => {
    // Posse: o Customer precisa ser desta loja.
    const customer = await tx.customer.findFirst({
      where: { id: params.customerId, storeId },
      select: { id: true },
    })
    if (!customer) return { ok: false as const, reason: 'not_found' as const }

    let account = await tx.fiadoAccount.findUnique({ where: { customerId: params.customerId } })
    if (account && account.storeId !== storeId) {
      return { ok: false as const, reason: 'not_found' as const }
    }
    if (!account) {
      // Cliente novo na caderneta: respeita o teto de clientes do plano (Essencial = 25).
      if (maxCustomers != null) {
        const count = await tx.fiadoAccount.count({ where: { storeId } })
        if (count >= maxCustomers) return { ok: false as const, reason: 'customer_limit' as const }
      }
      account = await tx.fiadoAccount.create({
        data: { storeId, customerId: params.customerId, creditLimit: round2(defaultCreditLimit) },
      })
    }

    const balance = decimalToNumber(account.balance)
    if (params.type === 'DEBIT') {
      if (account.status === 'BLOCKED') return { ok: false as const, reason: 'blocked' as const }
      const limit = decimalToNumber(account.creditLimit)
      if (!force && limit > 0 && round2(balance + amount) > limit) {
        return { ok: false as const, reason: 'limit' as const }
      }
    } else if (!force && amount > balance) {
      // Pagamento maior que a dívida → confirmaria saldo negativo (crédito do cliente).
      return { ok: false as const, reason: 'overpay' as const }
    }

    const entry = await tx.fiadoEntry.create({
      data: {
        storeId,
        fiadoAccountId: account.id,
        customerId: params.customerId,
        type: params.type,
        amount,
        description: params.description ?? null,
        orderId: params.orderId ?? null,
        dueDate: params.dueDate ?? null,
        reversesEntryId: params.reversesEntryId ?? null,
        createdByUserId: params.createdByUserId,
      },
    })

    const delta = params.type === 'DEBIT' ? amount : -amount
    const updated = await tx.fiadoAccount.update({
      where: { id: account.id },
      data: { balance: { increment: delta } },
    })

    return { ok: true as const, balance: decimalToNumber(updated.balance), entryId: entry.id }
  })
}

/** Carrega um lançamento garantindo posse da loja (para estorno). */
export function getFiadoEntry(storeId: string, id: string) {
  return prisma.fiadoEntry.findFirst({ where: { id, storeId } })
}

/** Há lançamento que ESTORNA este? (evita estorno duplo) */
export async function isEntryReversed(storeId: string, entryId: string): Promise<boolean> {
  const count = await prisma.fiadoEntry.count({ where: { storeId, reversesEntryId: entryId } })
  return count > 0
}

/** Atualiza limite de crédito da conta (cria a conta se ainda não existir). Escopado por storeId. */
export async function updateFiadoCreditLimit(
  storeId: string,
  customerId: string,
  creditLimit: number,
): Promise<boolean> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
    select: { id: true },
  })
  if (!customer) return false
  const limit = round2(creditLimit)
  await prisma.fiadoAccount.upsert({
    where: { customerId },
    create: { storeId, customerId, creditLimit: limit },
    update: { creditLimit: limit },
  })
  return true
}

/** Bloqueia/desbloqueia a conta (escopado por storeId). Cria a conta se ainda não existir. */
export async function setFiadoAccountStatus(
  storeId: string,
  customerId: string,
  status: 'ACTIVE' | 'BLOCKED',
  defaultCreditLimit = 0,
): Promise<boolean> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
    select: { id: true },
  })
  if (!customer) return false
  await prisma.fiadoAccount.upsert({
    where: { customerId },
    create: { storeId, customerId, status, creditLimit: round2(defaultCreditLimit) },
    update: { status },
  })
  return true
}

/** Já existe um lançamento de fiado para este pedido? (evita lançar o mesmo pedido 2x) */
export async function getFiadoEntryByOrder(storeId: string, orderId: string) {
  return prisma.fiadoEntry.findFirst({
    where: { storeId, orderId, reversesEntryId: null },
    orderBy: { createdAt: 'asc' },
  })
}

/** Atualiza apenas os campos de fiado em StoreSettings (upsert — cria a linha se faltar). */
export async function updateFiadoSettings(
  storeId: string,
  data: {
    fiadoEnabled: boolean
    fiadoDefaultTermDays: number
    fiadoDefaultCreditLimit: number
    fiadoReminderTemplate: string | null
  },
) {
  await prisma.storeSettings.upsert({
    where: { storeId },
    create: { storeId, ...data },
    update: data,
  })
}
