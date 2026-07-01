import { prisma } from '@/lib/prisma'
import type { Plan, StoreStatus, BillingType, Prisma } from '@prisma/client'
import { deriveIsActive } from '@/lib/store-status'
import { decimalToNumber } from '@/lib/format'

/** Repositório de billing/assinatura. Escopado por storeId nas leituras da loja. */

export function getSubscription(storeId: string) {
  return prisma.subscription.findUnique({ where: { storeId } })
}

export function getSubscriptionByGatewaySubId(gatewaySubscriptionId: string) {
  return prisma.subscription.findFirst({
    where: { gatewaySubscriptionId },
    include: { store: true },
  })
}

/** Atualiza status da loja e mantém isActive (legado) coerente. */
export async function setStoreStatus(storeId: string, status: StoreStatus) {
  await prisma.store.update({
    where: { id: storeId },
    data: { status, isActive: deriveIsActive(status) },
  })
}

/** Muda o plano da loja (e da assinatura, se houver). Aceita um cliente de
 *  transação para compor com outras escritas atomicamente. */
export async function setStorePlan(
  storeId: string,
  plan: Plan,
  db: Prisma.TransactionClient = prisma,
) {
  await db.store.update({ where: { id: storeId }, data: { plan } })
  await db.subscription.updateMany({ where: { storeId }, data: { plan } })
}

/** Atualiza só o status da assinatura (espelho do gateway). */
export async function setSubscriptionStatus(storeId: string, status: string) {
  await prisma.subscription.updateMany({ where: { storeId }, data: { status } })
}

export async function upsertSubscription(
  storeId: string,
  data: {
    plan: Plan
    value: number
    billingType?: BillingType
    status?: string
    gatewayCustomerId?: string | null
    gatewaySubscriptionId?: string | null
    nextDueDate?: Date | null
  },
  db: Prisma.TransactionClient = prisma,
) {
  return db.subscription.upsert({
    where: { storeId },
    create: {
      storeId,
      plan: data.plan,
      value: data.value,
      billingType: data.billingType ?? 'UNDEFINED',
      status: data.status ?? 'PENDING',
      gatewayCustomerId: data.gatewayCustomerId ?? null,
      gatewaySubscriptionId: data.gatewaySubscriptionId ?? null,
      nextDueDate: data.nextDueDate ?? null,
    },
    update: {
      plan: data.plan,
      value: data.value,
      ...(data.billingType ? { billingType: data.billingType } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.gatewayCustomerId !== undefined ? { gatewayCustomerId: data.gatewayCustomerId } : {}),
      ...(data.gatewaySubscriptionId !== undefined
        ? { gatewaySubscriptionId: data.gatewaySubscriptionId }
        : {}),
      ...(data.nextDueDate !== undefined ? { nextDueDate: data.nextDueDate } : {}),
    },
  })
}

// ---------- Plataforma (SUPERADMIN) ----------

export function listAllStoresForPlatform() {
  return prisma.store.findMany({
    include: {
      subscription: true,
      _count: { select: { products: true } },
      users: { where: { role: { in: ['OWNER', 'STAFF'] } }, select: { email: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function platformStats() {
  const [total, active, pastDue, suspended, activeSubs] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { status: 'ACTIVE' } }),
    prisma.store.count({ where: { status: 'PAST_DUE' } }),
    prisma.store.count({ where: { status: 'SUSPENDED' } }),
    prisma.subscription.findMany({ where: { store: { status: 'ACTIVE' } }, select: { value: true } }),
  ])
  const mrr = activeSubs.reduce((s, x) => s + decimalToNumber(x.value), 0)
  return { total, active, pastDue, suspended, mrr }
}
