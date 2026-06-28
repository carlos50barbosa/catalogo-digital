import type { NextRequest } from 'next/server'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import {
  eventAlreadyProcessed,
  recordBillingEvent,
  getSubscriptionByGatewaySubId,
  setStoreStatus,
  setSubscriptionStatus,
} from '@/lib/data/billing'

export const dynamic = 'force-dynamic'

function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

/**
 * Webhook do Asaas — sincroniza o status da loja com a cobrança.
 * Segurança: header `asaas-access-token` deve bater com ASAAS_WEBHOOK_TOKEN.
 * Idempotência: cada evento é registrado em BillingEvent (gatewayEventId único).
 */
export async function POST(req: NextRequest) {
  // 1) Autenticidade
  const token = req.headers.get('asaas-access-token')
  if (!config.asaas.webhookToken || token !== config.asaas.webhookToken) {
    return new Response('unauthorized', { status: 401 })
  }

  let body: {
    id?: string
    event?: string
    payment?: { id?: string; customer?: string; subscription?: string; dueDate?: string }
  }
  try {
    body = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const event = body.event ?? ''
  const payment = body.payment ?? null
  const eventId = body.id ?? (payment?.id ? `${event}:${payment.id}` : '')
  if (!event || !eventId) return new Response('ignored', { status: 200 })

  // 2) Idempotência — não processa o mesmo evento duas vezes.
  if (await eventAlreadyProcessed(eventId)) return new Response('ok', { status: 200 })

  // Resolve a loja pela assinatura (ou pelo cliente).
  let storeId: string | null = null
  if (payment?.subscription) {
    const sub = await getSubscriptionByGatewaySubId(payment.subscription)
    storeId = sub?.storeId ?? null
  }
  if (!storeId && payment?.customer) {
    const sub = await prisma.subscription.findFirst({
      where: { gatewayCustomerId: payment.customer },
    })
    storeId = sub?.storeId ?? null
  }

  await recordBillingEvent({ storeId, gatewayEventId: eventId, type: event, payload: body })

  // 3) Mapeamento evento -> status (resiliente; eventos não tratados ficam só logados).
  if (storeId) {
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await setSubscriptionStatus(storeId, 'ACTIVE')
        await setStoreStatus(storeId, 'ACTIVE')
        if (payment?.dueDate) {
          await prisma.subscription.updateMany({
            where: { storeId },
            data: { nextDueDate: addMonths(new Date(payment.dueDate), 1) },
          })
        }
        break
      case 'PAYMENT_OVERDUE':
        await setStoreStatus(storeId, 'PAST_DUE')
        break
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_DELETED':
        await setSubscriptionStatus(storeId, 'CANCELED')
        await setStoreStatus(storeId, 'SUSPENDED')
        break
      default:
        break
    }
  }

  return new Response('ok', { status: 200 })
}
