'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import {
  getSubscription,
  setStorePlan,
  upsertSubscription,
  setSubscriptionStatus,
  setStoreStatus,
} from '@/lib/data/billing'
import { PLANS } from '@/lib/plans'
import { gateway } from '@/lib/billing'
import { config } from '@/lib/config'

const planEnum = z.enum(['ESSENCIAL', 'PROFISSIONAL', 'PREMIUM'])

/** Upgrade/downgrade do próprio plano (limites aplicam na hora). */
export async function changePlanSelfAction(plan: string) {
  const { storeId } = await requireStore()
  const p = planEnum.safeParse(plan)
  if (!p.success) return { ok: false as const, error: 'Plano inválido.' }

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
  revalidatePath('/painel/assinatura')
  return { ok: true as const }
}

/** Cancela a própria assinatura. (MVP: efeito imediato; fim-de-ciclo é melhoria futura via cron.) */
export async function cancelSubscriptionSelfAction() {
  const { storeId } = await requireStore()
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
  revalidatePath('/painel/assinatura')
  return { ok: true as const }
}

/** Atualizar forma de pagamento → redireciona ao fluxo hospedado do Asaas. */
export async function updatePaymentAction() {
  const { storeId } = await requireStore()
  const sub = await getSubscription(storeId)
  if (!sub?.gatewaySubscriptionId) return { ok: false as const, error: 'Sem assinatura ativa.' }
  let url: string | null = null
  try {
    url = await gateway.getSubscriptionPaymentUrl(sub.gatewaySubscriptionId)
  } catch {
    url = null
  }
  if (!url) return { ok: false as const, error: 'Página de pagamento indisponível no momento.' }
  redirect(url)
}
