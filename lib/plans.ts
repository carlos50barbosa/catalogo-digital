import type { Plan } from '@prisma/client'

// Fonte ÚNICA da verdade dos planos: limites e recursos.
// Nunca espalhe `if plan === ...` pelo código — use os helpers daqui.

export type Branding = 'basic' | 'full'

export type PlanFeatures = {
  label: string
  resumo: string
  /** null = ilimitado */
  maxProducts: number | null
  ofertasEnabled: boolean
  customBranding: Branding
  prioritySupport: boolean
  /** controle de fiado (caderneta digital) — disponível a partir do Profissional */
  fiadoEnabled: boolean
  /** serviço "feito pra você" (fotos/posts) — flag de direito, não trava de software */
  managedContent: boolean
  /** valor mensal de referência (R$). O valor real cobrado vem da assinatura/gateway. */
  value: number
  priceLabel: string
}

export const PLANS: Record<Plan, PlanFeatures> = {
  ESSENCIAL: {
    label: 'Essencial',
    resumo: 'Pra começar a vender pelo WhatsApp.',
    maxProducts: 80,
    ofertasEnabled: false,
    customBranding: 'basic',
    prioritySupport: false,
    fiadoEnabled: false,
    managedContent: false,
    value: 59,
    priceLabel: 'R$ 59/mês',
  },
  PROFISSIONAL: {
    label: 'Profissional',
    resumo: 'O mais escolhido pelos mercadinhos.',
    maxProducts: null,
    ofertasEnabled: true,
    customBranding: 'full',
    prioritySupport: true,
    fiadoEnabled: true,
    managedContent: false,
    value: 119,
    priceLabel: 'R$ 119/mês',
  },
  PREMIUM: {
    label: 'Premium',
    resumo: 'Com conteúdo e fotos feitos pra você todo mês.',
    maxProducts: null,
    ofertasEnabled: true,
    customBranding: 'full',
    prioritySupport: true,
    fiadoEnabled: true,
    managedContent: true,
    value: 199,
    priceLabel: 'R$ 199/mês',
  },
}

export const ORDERED_PLANS: Plan[] = ['ESSENCIAL', 'PROFISSIONAL', 'PREMIUM']

export function planFeatures(plan: Plan): PlanFeatures {
  return PLANS[plan]
}

export function productLimit(plan: Plan): number | null {
  return PLANS[plan].maxProducts
}

/** Pode adicionar mais um produto? (limite do plano vs uso atual) */
export function canAddProduct(plan: Plan, currentCount: number): boolean {
  const max = PLANS[plan].maxProducts
  return max === null || currentCount < max
}

export type Feature = 'ofertas' | 'managedContent' | 'prioritySupport' | 'customMessage' | 'fiado'

/** Check centralizado de recurso por plano. */
export function can(plan: Plan, feature: Feature): boolean {
  const f = PLANS[plan]
  switch (feature) {
    case 'ofertas':
      return f.ofertasEnabled
    case 'managedContent':
      return f.managedContent
    case 'prioritySupport':
      return f.prioritySupport
    case 'customMessage':
      return f.customBranding === 'full'
    case 'fiado':
      return f.fiadoEnabled
    default:
      return false
  }
}
