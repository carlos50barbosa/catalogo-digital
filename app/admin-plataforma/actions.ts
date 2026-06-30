'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/auth-helpers'
import {
  setStoreStatus,
  setStorePlan,
  upsertSubscription,
  setSubscriptionStatus,
  getSubscription,
} from '@/lib/data/billing'
import { PLANS } from '@/lib/plans'
import { gateway } from '@/lib/billing'
import { provisionSubscription } from '@/lib/billing/service'
import { config } from '@/lib/config'

const planEnum = z.enum(['ESSENCIAL', 'PROFISSIONAL', 'PREMIUM'])
const statusEnum = z.enum(['PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'])
const billingEnum = z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED'])

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
 * - Com ASAAS_API_KEY: cria cliente + assinatura recorrente no Asaas, e guarda
 *   os IDs do gateway.
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
    if (!cpfCnpj) {
      return { ok: false as const, error: 'Informe um CPF/CNPJ válido para criar a cobrança no Asaas.' }
    }
    // Reaproveita o serviço compartilhado (mesma lógica do self-service).
    const res = await provisionSubscription({
      storeId,
      plan: p.data,
      billingType: b.data,
      cpfCnpj,
      mode: 'PAY_TO_ACTIVATE',
    })
    if (!res.ok) return { ok: false as const, error: res.error }
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
