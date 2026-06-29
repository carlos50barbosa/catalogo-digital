import Link from 'next/link'
import { Check, MessageCircle, CalendarClock, CreditCard, Boxes, Sparkles } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { getSubscription } from '@/lib/data/billing'
import { planFeatures, productLimit, PLANS, ORDERED_PLANS } from '@/lib/plans'
import { STATUS_LABELS } from '@/lib/store-status'
import { formatBRL, formatDateTimeBR, decimalToNumber } from '@/lib/format'
import { config } from '@/lib/config'
import { SubscriptionManager } from '@/components/admin/SubscriptionManager'

export const dynamic = 'force-dynamic'

function wa(msg: string) {
  return `https://wa.me/${config.salesWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
}

export default async function AssinaturaPage() {
  const { storeId } = await requireStore()
  const [store, productCount, subscription] = await Promise.all([
    getStoreForPanel(storeId),
    countProducts(storeId),
    getSubscription(storeId),
  ])

  const plan = store?.plan ?? 'ESSENCIAL'
  const features = planFeatures(plan)
  const limit = productLimit(plan)
  const status = store?.status ?? 'ACTIVE'
  const needsAttention = status === 'PAST_DUE' || status === 'SUSPENDED'

  const featureList = [
    limit === null ? 'Produtos ilimitados' : `Até ${limit} produtos`,
    features.ofertasEnabled ? 'Seção de ofertas' : 'Catálogo padrão',
    features.customBranding === 'full' ? 'Personalização completa da marca' : 'Logo + cor',
    features.prioritySupport ? 'Suporte prioritário' : 'Suporte padrão',
    ...(features.managedContent ? ['Conteúdo e fotos feitos pra você todo mês'] : []),
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Meu plano</h1>
        <p className="text-sm text-neutral-500">Seu plano, uso e cobrança.</p>
      </div>

      {/* Plano atual */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Plano atual</p>
            <p className="font-display text-2xl font-extrabold text-neutral-900">{features.label}</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-fg">
            {features.priceLabel}
          </span>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {featureList.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-neutral-700">
              <Check className="h-4 w-4 shrink-0 text-green-600" /> {f}
            </li>
          ))}
        </ul>

        {/* Uso vs limite */}
        <div className="mt-5 rounded-xl bg-neutral-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-neutral-700">
              <Boxes className="h-4 w-4 text-neutral-400" /> Produtos
            </span>
            <span className="text-neutral-600">
              {limit === null ? `${productCount} (ilimitado)` : `${productCount} de ${limit}`}
            </span>
          </div>
          {limit !== null && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.round((productCount / limit) * 100))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Cobrança / assinatura */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <p className="mb-3 text-sm font-medium text-neutral-700">Cobrança</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Info icon={<CreditCard className="h-4 w-4" />} label="Status" value={STATUS_LABELS[status]} />
          <Info
            icon={<CalendarClock className="h-4 w-4" />}
            label="Próxima cobrança"
            value={subscription?.nextDueDate ? formatDateTimeBR(subscription.nextDueDate) : '—'}
          />
          <Info
            icon={<CreditCard className="h-4 w-4" />}
            label="Valor"
            value={subscription ? formatBRL(decimalToNumber(subscription.value)) : '—'}
          />
        </div>

        {!subscription && (
          <p className="mt-4 text-sm text-neutral-500">
            Sua assinatura ainda não foi configurada. Fale com a gente para ativar.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {needsAttention && (
            <a
              href={wa(`Olá! Quero regularizar a assinatura da minha loja (${store?.slug}).`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-zap px-4 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="h-5 w-5" /> Regularizar pagamento
            </a>
          )}
          <a
            href={wa(`Olá! Quero mudar o plano da minha loja (${store?.slug}). Hoje estou no ${features.label}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            <MessageCircle className="h-5 w-5" /> Quero mudar de plano
          </a>
        </div>
      </div>

      {/* Self-service: mudar plano / pagamento / cancelar */}
      <SubscriptionManager currentPlan={plan} hasSubscription={!!subscription} />

      {/* Outros planos */}
      <div>
        <p className="mb-3 text-sm font-medium text-neutral-500">Outros planos</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ORDERED_PLANS.map((p) => {
            const f = PLANS[p]
            const current = p === plan
            return (
              <div
                key={p}
                className={
                  'rounded-2xl border bg-white p-4 shadow-soft ' +
                  (current ? 'border-accent ring-1 ring-accent' : 'border-neutral-200')
                }
              >
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-neutral-900">{f.label}</p>
                  {f.managedContent && <Sparkles className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="mt-1 font-semibold text-accent">{f.priceLabel}</p>
                <p className="mt-1 text-xs text-neutral-500">{f.resumo}</p>
                {current ? (
                  <p className="mt-3 text-xs font-semibold text-neutral-400">Seu plano atual</p>
                ) : (
                  <a
                    href={wa(`Olá! Quero o plano ${f.label} pra minha loja (${store?.slug}).`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs font-semibold text-accent underline"
                  >
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          + taxa única de montagem (a partir de {formatBRL(config.setupFee)}).
        </p>
      </div>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="flex items-center gap-1.5 text-xs text-neutral-500">
        {icon} {label}
      </p>
      <p className="mt-1 font-semibold text-neutral-900">{value}</p>
    </div>
  )
}
