import { AsaasGateway } from './asaas'
import type { BillingGateway } from './gateway'

export type { BillingGateway } from './gateway'

// Ponto único de acesso ao gateway. Trocar de provedor = mudar só aqui.
export const gateway: BillingGateway = new AsaasGateway()
