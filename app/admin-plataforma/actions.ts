'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import {
  setStoreStatus,
  setStorePlan,
  upsertSubscription,
  setSubscriptionStatus,
  getSubscription,
} from '@/lib/data/billing'
import { PLANS } from '@/lib/plans'
import { gateway } from '@/lib/billing'
import { config } from '@/lib/config'

const planEnum = z.enum(['ESSENCIAL', 'PROFISSIONAL', 'PREMIUM'])
const statusEnum = z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'])
const billingEnum = z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED'])

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Override manual de status (essencial no início semi-manual e em casos de borda). */
export async function overrideStatusAction(storeId: string, status: string) {
  await requireSuperadmin()
  const s = statusEnum.safeParse(status)
  if (!s.success) return { ok: false as const, error: 'Status inválido.' }
  await setStoreStatus(storeId, s.data)
  revalidatePath('/admin-plataforma')
  return { ok: true as const }
}

export async function changePlanAction(storeId: string, plan: string) {
  await requireSuperadmin()
  const p = planEnum.safeParse(plan)
  if (!p.success) return { ok: false as const, error: 'Plano inválido.' }

  // Ajusta o valor no gateway, se houver assinatura ligada.
  if (config.asaas.apiKey) {
    const sub = await getSubscription(storeId)
    if (sub?.gatewaySubscriptionId) {
      try {
        await gateway.updateSubscription(sub.gatewaySubscriptionId, { value: PLANS[p.data].value })
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : 'Falha ao atualizar no Asaas.' }
      }
    }
  }

  await setStorePlan(storeId, p.data)
  await upsertSubscription(storeId, { plan: p.data, value: PLANS[p.data].value })
  revalidatePath('/admin-plataforma')
  return { ok: true as const }
}

/**
 * Cria a assinatura da loja.
 * - Com ASAAS_API_KEY: cria cliente + assinatura recorrente + cobrança avulsa da taxa
 *   de montagem no Asaas, e guarda os IDs do gateway.
 * - Sem chave (dev/semi-manual): cria a assinatura só localmente (status PENDING).
 */
export async function createSubscriptionAction(
  storeId: string,
  plan: string,
  billingType: string,
  cpfCnpj?: string,
) {
  await requireSuperadmin()
  const p = planEnum.safeParse(plan)
  const b = billingEnum.safeParse(billingType)
  if (!p.success || !b.success) return { ok: false as const, error: 'Dados inválidos.' }
  const value = PLANS[p.data].value

  if (config.asaas.apiKey) {
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
      return { ok: false as const, error: 'Informe um CPF/CNPJ válido para criar a cobrança no Asaas.' }
    }
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { users: { where: { role: 'OWNER' }, take: 1, select: { email: true } } },
    })
    if (!store) return { ok: false as const, error: 'Loja não encontrada.' }

    try {
      const customer = await gateway.createCustomer({
        name: store.name,
        cpfCnpj,
        email: store.users[0]?.email,
        externalReference: store.id,
      })
      const nextDue = ymd(addDays(new Date(), 3))
      const sub = await gateway.createSubscription({
        customerId: customer.id,
        billingType: b.data,
        value,
        nextDueDate: nextDue,
        description: `Assinatura ${PLANS[p.data].label} — ${store.name}`,
        externalReference: store.id,
      })
      // Taxa de montagem: cobrança avulsa única (não faz parte da assinatura).
      try {
        await gateway.createOneOffCharge({
          customerId: customer.id,
          billingType: b.data,
          value: config.setupFee,
          dueDate: ymd(addDays(new Date(), 3)),
          description: `Taxa de montagem — ${store.name}`,
        })
      } catch {
        // taxa de montagem é secundária; não bloqueia a assinatura
      }

      await setStorePlan(storeId, p.data)
      await upsertSubscription(storeId, {
        plan: p.data,
        value,
        billingType: b.data,
        status: sub.status ?? 'PENDING',
        gatewayCustomerId: customer.id,
        gatewaySubscriptionId: sub.id,
        nextDueDate: sub.nextDueDate ? new Date(sub.nextDueDate) : new Date(nextDue),
      })
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Falha ao criar assinatura no Asaas.' }
    }
  } else {
    // Sem gateway: assinatura local (semi-manual).
    await setStorePlan(storeId, p.data)
    await upsertSubscription(storeId, { plan: p.data, value, billingType: b.data, status: 'PENDING' })
  }

  revalidatePath('/admin-plataforma')
  return { ok: true as const }
}

export async function cancelSubscriptionAction(storeId: string) {
  await requireSuperadmin()

  if (config.asaas.apiKey) {
    const sub = await getSubscription(storeId)
    if (sub?.gatewaySubscriptionId) {
      try {
        await gateway.cancelSubscription(sub.gatewaySubscriptionId)
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : 'Falha ao cancelar no Asaas.' }
      }
    }
  }

  await setSubscriptionStatus(storeId, 'CANCELED')
  await setStoreStatus(storeId, 'CANCELED')
  revalidatePath('/admin-plataforma')
  return { ok: true as const }
}
