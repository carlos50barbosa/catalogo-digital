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
    const sub = await gateway.createSubscription({
      customerId: customer.id,
      billingType: opts.billingType,
      value,
      nextDueDate: nextDue,
      description: `Assinatura ${PLANS[opts.plan].label} — ${store.name}`,
      externalReference: store.id,
    })

    // URL do checkout hospedado: taxa de montagem (paga agora) ou a 1ª cobrança da assinatura.
    let checkoutUrl: string | null = null
    if (config.setupFee > 0) {
      try {
        const charge = await gateway.createOneOffCharge({
          customerId: customer.id,
          billingType: opts.billingType,
          value: config.setupFee,
          dueDate: ymd(new Date()),
          description: `Taxa de montagem — ${store.name}`,
        })
        checkoutUrl = charge.invoiceUrl ?? null
      } catch {
        // taxa de montagem é secundária
      }
    }
    if (!checkoutUrl) {
      try {
        checkoutUrl = await gateway.getSubscriptionPaymentUrl(sub.id)
      } catch {
        checkoutUrl = null
      }
    }

    await setStorePlan(opts.storeId, opts.plan)
    await upsertSubscription(opts.storeId, {
      plan: opts.plan,
      value,
      billingType: opts.billingType,
      status: sub.status ?? 'PENDING',
      gatewayCustomerId: customer.id,
      gatewaySubscriptionId: sub.id,
      nextDueDate: sub.nextDueDate ? new Date(sub.nextDueDate) : new Date(nextDue),
    })

    return { ok: true, checkoutUrl }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao criar assinatura.' }
  }
}
