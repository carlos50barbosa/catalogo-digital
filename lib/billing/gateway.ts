import type { BillingType } from '@prisma/client'

// Interface do gateway de cobrança. Implementação concreta: AsaasGateway.
// Trocar por Mercado Pago/Pagar.me no futuro = nova implementação desta interface.

export type GatewayCustomer = { id: string }

export type GatewaySubscription = {
  id: string
  status?: string
  nextDueDate?: string | null
}

export type GatewayCharge = {
  id: string
  invoiceUrl?: string | null
}

export interface BillingGateway {
  createCustomer(input: {
    name: string
    cpfCnpj: string
    email?: string | null
    mobilePhone?: string | null
    externalReference?: string
  }): Promise<GatewayCustomer>

  createSubscription(input: {
    customerId: string
    billingType: BillingType
    value: number
    /** 'YYYY-MM-DD' */
    nextDueDate: string
    cycle?: string
    description?: string
    externalReference?: string
  }): Promise<GatewaySubscription>

  updateSubscription(
    subscriptionId: string,
    input: { value?: number; billingType?: BillingType },
  ): Promise<void>

  cancelSubscription(subscriptionId: string): Promise<void>

  /** URL da página de pagamento hospedada da 1ª cobrança da assinatura (para redirect). */
  getSubscriptionPaymentUrl(subscriptionId: string): Promise<string | null>

  /** Cobrança avulsa única (ex.: taxa de montagem). */
  createOneOffCharge(input: {
    customerId: string
    billingType: BillingType
    value: number
    /** 'YYYY-MM-DD' */
    dueDate: string
    description?: string
  }): Promise<GatewayCharge>
}
