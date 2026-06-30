import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSubscription } from '@/lib/data/billing'
import { planFeatures } from '@/lib/plans'
import { formatBRL, decimalToNumber } from '@/lib/format'
import { config } from '@/lib/config'
import { AguardandoActions } from '@/components/signup/AguardandoActions'

export const dynamic = 'force-dynamic'

const BILLING_LABELS: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
  UNDEFINED: 'A definir',
}

function wa(msg: string) {
  return `https://wa.me/${config.salesWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
}

export default async function AguardandoPage() {
  const session = await auth()
  if (!session?.user?.storeId) redirect('/painel/login')

  const [store, subscription] = await Promise.all([
    prisma.store.findUnique({
      where: { id: session.user.storeId },
      select: { status: true, name: true, slug: true },
    }),
    getSubscription(session.user.storeId),
  ])
  // Já ativou? vai pro onboarding.
  if (store?.status === 'ACTIVE' || store?.status === 'TRIALING') redirect('/painel/onboarding')

  const features = subscription ? planFeatures(subscription.plan) : null
  const waHref = wa(
    `Olá! Estou aguardando a confirmação do pagamento da minha loja (${store?.slug ?? store?.name ?? ''}) e preciso de ajuda.`,
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900">
          Aguardando confirmação do pagamento
        </h1>
        <p className="mt-2 text-neutral-600">
          Assim que o pagamento for confirmado, sua loja é ativada automaticamente e você é levado
          para a configuração. Pode deixar esta página aberta.
        </p>

        {subscription && features && (
          <dl className="mt-5 space-y-2 rounded-xl bg-neutral-50 p-4 text-left text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-neutral-500">Plano</dt>
              <dd className="font-semibold text-neutral-900">{features.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-neutral-500">Valor</dt>
              <dd className="font-semibold text-neutral-900">
                {formatBRL(decimalToNumber(subscription.value))}/mês
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-neutral-500">Pagamento</dt>
              <dd className="font-semibold text-neutral-900">
                {BILLING_LABELS[subscription.billingType] ?? subscription.billingType}
              </dd>
            </div>
          </dl>
        )}

        <AguardandoActions waHref={waHref} canReopen={!!subscription?.gatewaySubscriptionId} />

        <p className="mt-5 text-xs text-neutral-400">
          Pagou por PIX ou boleto? A confirmação pode levar alguns minutos. Você também receberá um
          e-mail quando a loja for ativada.
        </p>
      </div>
    </main>
  )
}
