import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'
import { getSubscriptionByGatewaySubId } from '@/lib/data/billing'
import { deriveIsActive } from '@/lib/store-status'

export const dynamic = 'force-dynamic'

function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

type Welcome = { email: string; name: string }

/**
 * Webhook do Asaas — sincroniza o status da loja com a cobrança.
 * Segurança: header `asaas-access-token` deve bater com ASAAS_WEBHOOK_TOKEN.
 * Idempotência ATÔMICA: o INSERT de BillingEvent (gatewayEventId @unique) é a
 * trava. Gravar o evento e aplicar as mutações de status acontecem na MESMA
 * transação — se qualquer mutação falhar, tudo desfaz e o Asaas reprocessa no
 * retry (a loja paga não fica sem ativar por falha silenciosa). Se o evento já
 * foi processado, o unique dispara P2002 e respondemos 200 sem reexecutar.
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
  if (!storeId) {
    // Evento sem loja resolvível (cliente/assinatura fora do nosso banco). Fica
    // registrado para auditoria; logamos para reconciliação manual.
    console.warn(
      `[webhook asaas] evento ${event}/${eventId} sem loja resolvível ` +
        `(subscription=${payment?.subscription ?? '-'}, customer=${payment?.customer ?? '-'})`,
    )
  }

  // 2) Idempotência + efeitos na MESMA transação. O callback devolve os dados do
  //    e-mail de boas-vindas (se for a 1ª ativação) para ser enviado FORA da tx.
  let welcome: Welcome | null = null
  try {
    welcome = await prisma.$transaction(async (tx): Promise<Welcome | null> => {
      // O INSERT é a trava de idempotência: se o evento já foi visto, o @unique
      // lança P2002 e a transação inteira aborta (nada é reaplicado).
      await tx.billingEvent.create({
        data: {
          storeId,
          gatewayEventId: eventId,
          type: event,
          payload: body as Prisma.InputJsonValue,
        },
      })

      if (!storeId) return null // registrado; nada a mutar

      // 3) Mapeamento evento -> status (resiliente; eventos não tratados ficam só logados).
      switch (event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          const store = await tx.store.findUnique({
            where: { id: storeId },
            select: {
              status: true,
              name: true,
              users: { where: { role: 'OWNER' }, take: 1, select: { email: true } },
            },
          })
          const firstActivation = store?.status === 'PENDING' || store?.status === 'TRIALING'

          await tx.subscription.updateMany({ where: { storeId }, data: { status: 'ACTIVE' } })
          await tx.store.update({
            where: { id: storeId },
            data: { status: 'ACTIVE', isActive: deriveIsActive('ACTIVE') },
          })
          if (payment?.dueDate) {
            await tx.subscription.updateMany({
              where: { storeId },
              data: { nextDueDate: addMonths(new Date(payment.dueDate), 1) },
            })
          }

          const ownerEmail = store?.users[0]?.email
          return firstActivation && ownerEmail && store
            ? { email: ownerEmail, name: store.name }
            : null
        }
        case 'PAYMENT_OVERDUE': {
          // Só rebaixa se a cobrança vencida for da PRÓPRIA assinatura da loja.
          // Cobranças avulsas/duplicadas no mesmo cliente Asaas chegam sem
          // `payment.subscription` (ou com outra assinatura) e eram resolvidas pelo
          // cliente — derrubando para PAST_DUE lojas com a mensalidade em dia. Aqui
          // exigimos que o vencido seja o da assinatura antes de rebaixar.
          const sub = await tx.subscription.findUnique({
            where: { storeId },
            select: { gatewaySubscriptionId: true },
          })
          const paySub = payment?.subscription ?? null
          if (!paySub || !sub?.gatewaySubscriptionId || paySub !== sub.gatewaySubscriptionId) {
            console.warn(
              `[webhook asaas] PAYMENT_OVERDUE ignorado: cobrança ${payment?.id ?? '-'} ` +
                `não é da assinatura da loja ${storeId} ` +
                `(payload.subscription=${paySub ?? '-'}, loja.subscription=${sub?.gatewaySubscriptionId ?? '-'}).`,
            )
            return null
          }
          await tx.store.update({
            where: { id: storeId },
            data: { status: 'PAST_DUE', isActive: deriveIsActive('PAST_DUE') },
          })
          return null
        }
        case 'PAYMENT_REFUNDED':
        case 'PAYMENT_CHARGEBACK_REQUESTED':
        case 'PAYMENT_DELETED':
          await tx.subscription.updateMany({ where: { storeId }, data: { status: 'CANCELED' } })
          await tx.store.update({
            where: { id: storeId },
            data: { status: 'SUSPENDED', isActive: deriveIsActive('SUSPENDED') },
          })
          return null
        default:
          return null
      }
    })
  } catch (e) {
    // Evento já processado (corrida/retry do Asaas): o unique barra a 2ª gravação.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new Response('ok', { status: 200 })
    }
    // Mutação falhou → transação desfeita → deixamos o Asaas reprocessar no retry.
    console.error(`[webhook asaas] falha ao processar evento ${event}/${eventId}`, e)
    return new Response('erro ao processar', { status: 500 })
  }

  // Efeito colateral externo FORA da transação (não deve travar/desfazer o webhook).
  if (welcome) {
    try {
      await sendWelcomeEmail(welcome.email, welcome.name, `${config.appUrl}/painel`)
    } catch {
      // e-mail é secundário; não falha o webhook
    }
  }

  return new Response('ok', { status: 200 })
}
