import { gateway } from '@/lib/billing'
import { upsertSubscription, setStorePlan } from '@/lib/data/billing'
import { PLANS } from '@/lib/plans'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import type { Plan, BillingType } from '@prisma/client'

// Orquestra a criação da assinatura no gateway + persistência local.
// Reutilizado pelo self-service (com redirect ao checkout) e pelo admin.

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export type ProvisionResult =
  | { ok: true; checkoutUrl: string | null }
  | { ok: false; error: string }

export async function provisionSubscription(opts: {
  storeId: string
  plan: Plan
  billingType: BillingType
  cpfCnpj: string
  mode?: 'PAY_TO_ACTIVATE' | 'TRIAL'
}): Promise<ProvisionResult> {
  if (!config.asaas.apiKey) {
    return { ok: false, error: 'Pagamento indisponível no momento. Tente mais tarde.' }
  }
  const cpf = opts.cpfCnpj.replace(/\D/g, '')
  if (cpf.length < 11) return { ok: false, error: 'Informe um CPF/CNPJ válido.' }

  const store = await prisma.store.findUnique({
    where: { id: opts.storeId },
    include: { users: { where: { role: 'OWNER' }, take: 1, select: { email: true } } },
  })
  if (!store) return { ok: false, error: 'Loja não encontrada.' }

  const value = PLANS[opts.plan].value
  const trial = (opts.mode ?? config.signup.mode) === 'TRIAL'

  try {
    const customer = await gateway.createCustomer({
      name: store.name,
      cpfCnpj: cpf,
      email: store.users[0]?.email,
      externalReference: store.id,
    })

    const nextDue = ymd(trial ? addDays(new Date(), config.signup.trialDays) : new Date())
    const subInput = {
      customerId: customer.id,
      billingType: opts.billingType,
      value,
      nextDueDate: nextDue,
      description: `Assinatura ${PLANS[opts.plan].label} — ${store.name}`,
      externalReference: store.id,
    }
    // Após pagar no checkout hospedado, o Asaas traz o cliente de volta ao site.
    // O Asaas só aceita o successUrl se o domínio estiver cadastrado na conta
    // (Minha Conta › Informações). Se rejeitar, criamos sem callback para o
    // pagamento nunca travar — o redirect passa a funcionar assim que o domínio
    // for cadastrado, sem precisar de novo deploy.
    let sub: Awaited<ReturnType<typeof gateway.createSubscription>>
    try {
      sub = await gateway.createSubscription({
        ...subInput,
        callback: {
          successUrl: `${config.appUrl.replace(/\/+$/, '')}/cadastro/aguardando`,
          autoRedirect: true,
        },
      })
    } catch {
      sub = await gateway.createSubscription(subInput)
    }

    // URL do checkout hospedado: a 1ª cobrança da assinatura.
    let checkoutUrl: string | null = null
    try {
      checkoutUrl = await gateway.getSubscriptionPaymentUrl(sub.id)
    } catch {
      checkoutUrl = null
    }

    // Persistência local ATÔMICA: o webhook acha a loja pelo gatewaySubscriptionId/
    // gatewayCustomerId; se o plano gravasse mas a Subscription não (ou vice-versa),
    // o cliente pagaria e a loja nunca ativaria. As duas escritas vão na mesma
    // transação — ou ambas entram, ou nenhuma.
    try {
      await prisma.$transaction(async (tx) => {
        await setStorePlan(opts.storeId, opts.plan, tx)
        await upsertSubscription(
          opts.storeId,
          {
            plan: opts.plan,
            value,
            billingType: opts.billingType,
            status: sub.status ?? 'PENDING',
            gatewayCustomerId: customer.id,
            gatewaySubscriptionId: sub.id,
            nextDueDate: sub.nextDueDate ? new Date(sub.nextDueDate) : new Date(nextDue),
            cpfCnpj: cpf,
          },
          tx,
        )
      })
    } catch (e) {
      // A assinatura JÁ existe no Asaas, mas a gravação local falhou. Sem os IDs do
      // gateway no banco o webhook não acha a loja — logamos para reconciliação
      // manual e propagamos o erro ao chamador.
      console.error(
        `[billing] Falha ao persistir assinatura local (store=${opts.storeId}, ` +
          `asaasCustomer=${customer.id}, asaasSubscription=${sub.id}). Reconciliar manualmente.`,
        e,
      )
      throw e
    }

    return { ok: true, checkoutUrl }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao criar assinatura.' }
  }
}
