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

/** Status "vivo" (tolerância em PAST_DUE). PENDING/SUSPENDED/CANCELED são falsos. */
export function isStorefrontLive(status: StoreStatus): boolean {
  return status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE'
}

/** Vitrine pública = status vivo E publicada (onboarding concluído). */
export function isStorePublic(status: StoreStatus, published: boolean): boolean {
  return published && isStorefrontLive(status)
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
