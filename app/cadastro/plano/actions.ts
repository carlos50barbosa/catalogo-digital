'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { provisionSubscription } from '@/lib/billing/service'
import { gateway } from '@/lib/billing'
import { setStoreStatus } from '@/lib/data/billing'
import { fieldErrors } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import type { ActionState } from '@/lib/action-state'

const schema = z.object({
  plan: z.enum(['ESSENCIAL', 'PROFISSIONAL', 'PREMIUM']),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']),
  cpfCnpj: z.string().refine((v) => v.replace(/\D/g, '').length >= 11, 'CPF/CNPJ inválido'),
})

export async function choosePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth()
  const email = session?.user?.email
  const storeId = session?.user?.storeId
  if (!email || !storeId) redirect('/painel/login')

  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
  if (!rateLimit(`plan:${ip}`, 6, 60_000)) {
    return { error: 'Muitas tentativas. Aguarde um instante.' }
  }

  // Exige e-mail verificado.
  const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } })
  if (!user?.emailVerified) redirect('/cadastro/verificar-email')

  const parsed = schema.safeParse({
    plan: formData.get('plan'),
    billingType: formData.get('billingType'),
    cpfCnpj: String(formData.get('cpfCnpj') ?? ''),
  })
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  const res = await provisionSubscription({
    storeId,
    plan: parsed.data.plan,
    billingType: parsed.data.billingType,
    cpfCnpj: parsed.data.cpfCnpj,
    mode: config.signup.mode,
  })
  if (!res.ok) return { error: res.error }

  // TRIAL: loja entra em período de teste (pública só após publicar no onboarding).
  // PAY_TO_ACTIVATE: segue PENDING até o webhook confirmar o pagamento.
  if (config.signup.mode === 'TRIAL') await setStoreStatus(storeId, 'TRIALING')

  if (res.checkoutUrl) redirect(res.checkoutUrl) // página de pagamento hospedada do Asaas
  redirect('/cadastro/aguardando')
}

/** Usado pela tela "aguardando" para checar se a loja já foi ativada (via webhook). */
export async function checkActivationAction(): Promise<{ status: string | null }> {
  const session = await auth()
  const storeId = session?.user?.storeId
  if (!storeId) return { status: null }
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { status: true } })
  return { status: store?.status ?? null }
}

/**
 * Reabre a página de pagamento hospedada do Asaas. O checkout é um redirect
 * único no choosePlanAction; quem fecha a aba sem pagar fica preso na tela de
 * espera — esta action rebusca a invoiceUrl da assinatura e redireciona de novo.
 */
export async function reopenCheckoutAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  const storeId = session?.user?.storeId
  if (!storeId) redirect('/painel/login')

  const sub = await prisma.subscription.findUnique({
    where: { storeId },
    select: { gatewaySubscriptionId: true },
  })
  if (!sub?.gatewaySubscriptionId) {
    return { error: 'Não encontramos sua assinatura. Fale com o suporte.' }
  }

  let url: string | null = null
  try {
    url = await gateway.getSubscriptionPaymentUrl(sub.gatewaySubscriptionId)
  } catch {
    url = null
  }
  if (!url) {
    return { error: 'Não foi possível abrir o pagamento agora. Tente novamente em instantes.' }
  }
  redirect(url) // página de pagamento hospedada do Asaas
}
