import { config } from '@/lib/config'
import type {
  BillingGateway,
  GatewayCustomer,
  GatewaySubscription,
  GatewayCharge,
} from './gateway'

/**
 * Implementação do gateway via API do Asaas (https://docs.asaas.com).
 * Autenticação por header `access_token`. O produto NÃO guarda dados de cartão.
 */
async function asaasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!config.asaas.apiKey) {
    throw new Error('Asaas não configurado (defina ASAAS_API_KEY).')
  }
  const res = await fetch(`${config.asaas.baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: config.asaas.apiKey,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.description || `Erro Asaas (${res.status}). Verifique os dados.`
    throw new Error(msg)
  }
  return json as T
}

export class AsaasGateway implements BillingGateway {
  async createCustomer(input: {
    name: string
    cpfCnpj: string
    email?: string | null
    mobilePhone?: string | null
    externalReference?: string
  }): Promise<GatewayCustomer> {
    const data = await asaasFetch<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
        email: input.email ?? undefined,
        mobilePhone: input.mobilePhone ?? undefined,
        externalReference: input.externalReference,
      }),
    })
    return { id: data.id }
  }

  async createSubscription(input: {
    customerId: string
    billingType: string
    value: number
    nextDueDate: string
    cycle?: string
    description?: string
    externalReference?: string
  }): Promise<GatewaySubscription> {
    const data = await asaasFetch<{ id: string; status?: string; nextDueDate?: string }>(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify({
          customer: input.customerId,
          billingType: input.billingType,
          value: input.value,
          nextDueDate: input.nextDueDate,
          cycle: input.cycle ?? 'MONTHLY',
          description: input.description,
          externalReference: input.externalReference,
        }),
      },
    )
    return { id: data.id, status: data.status, nextDueDate: data.nextDueDate ?? null }
  }

  async updateSubscription(
    subscriptionId: string,
    input: { value?: number; billingType?: string },
  ): Promise<void> {
    await asaasFetch(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        value: input.value,
        billingType: input.billingType,
        updatePendingPayments: true,
      }),
    })
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
  }

  async createOneOffCharge(input: {
    customerId: string
    billingType: string
    value: number
    dueDate: string
    description?: string
  }): Promise<GatewayCharge> {
    const data = await asaasFetch<{ id: string; invoiceUrl?: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        billingType: input.billingType,
        value: input.value,
        dueDate: input.dueDate,
        description: input.description,
      }),
    })
    return { id: data.id, invoiceUrl: data.invoiceUrl ?? null }
  }
}
