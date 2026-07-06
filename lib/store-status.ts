import type { StoreStatus } from '@prisma/client'

// Efeitos do ciclo de status da loja, centralizados.

export const STATUS_LABELS: Record<StoreStatus, string> = {
  PENDING: 'Aguardando pagamento',
  TRIALING: 'Em teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento pendente',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
}

/**
 * Trial (sem cartão) vencido? TRIALING com prazo no passado. Como não há
 * assinatura no gateway, nenhum webhook rebaixa o status — a expiração é
 * avaliada preguiçosamente aqui (vitrine oculta na leitura; painel faz o
 * self-heal para PENDING no próximo acesso do lojista).
 */
export function isTrialExpired(
  status: StoreStatus,
  trialEndsAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return status === 'TRIALING' && !!trialEndsAt && trialEndsAt.getTime() < now.getTime()
}

/** Status "vivo" (tolerância em PAST_DUE). PENDING/SUSPENDED/CANCELED e trial vencido são falsos. */
export function isStorefrontLive(status: StoreStatus, trialEndsAt?: Date | null): boolean {
  if (isTrialExpired(status, trialEndsAt)) return false
  return status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE'
}

/** Vitrine pública = status vivo (trial não vencido) E publicada (onboarding concluído). */
export function isStorePublic(
  status: StoreStatus,
  published: boolean,
  trialEndsAt?: Date | null,
): boolean {
  return published && isStorefrontLive(status, trialEndsAt)
}

export function isSuspended(status: StoreStatus): boolean {
  return status === 'SUSPENDED'
}

export function isCanceled(status: StoreStatus): boolean {
  return status === 'CANCELED'
}

/** isActive derivado do status (mantém o campo legado coerente). */
export function deriveIsActive(status: StoreStatus): boolean {
  return status !== 'SUSPENDED' && status !== 'CANCELED'
}

// Nível de acesso ao painel conforme status.
export type PanelAccess = 'full' | 'warn' | 'billing_only' | 'readonly'

export function panelAccess(status: StoreStatus): PanelAccess {
  switch (status) {
    case 'PAST_DUE':
      return 'warn'
    case 'SUSPENDED':
      return 'billing_only'
    case 'CANCELED':
      return 'readonly'
    default:
      return 'full'
  }
}
