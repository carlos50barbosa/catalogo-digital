import Link from 'next/link'
import { Check, Palette, Truck, Package, Rocket, ExternalLink, QrCode } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { config } from '@/lib/config'
import { OnboardingPublishButton } from '@/components/admin/OnboardingPublishButton'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { storeId } = await requireStore()
  const [store, productCount] = await Promise.all([getStoreForPanel(storeId), countProducts(storeId)])
  const settings = store?.settings
  const min = config.signup.minProductsToPublish

  const brandDone = !!store?.logoUrl
  const deliveryDone = !!(settings?.address || settings?.pixKey)
  const productsDone = productCount >= min
  const canPublish = productsDone

  // Já publicada → estado de sucesso.
  if (store?.published) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <Rocket className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Sua loja está no ar! 🎉</h1>
        <p className="text-neutral-600">Divulgue o link e comece a receber pedidos no WhatsApp.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/${store.slug}`} target="_blank">
            <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg">
              <ExternalLink className="h-4 w-4" /> Ver minha loja
            </span>
          </Link>
          <Link href="/painel/divulgacao">
            <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800">
              <QrCode className="h-4 w-4" /> QR Code
            </span>
          </Link>
        </div>
      </div>
    )
  }

  const steps = [
    {
      icon: Palette,
      title: 'Sua marca',
      desc: 'Envie o logo, escolha a cor e confirme o WhatsApp.',
      todo: 'Falta enviar a logo da sua loja.',
      done: brandDone,
      href: '/painel/configuracoes',
      cta: 'Configurar marca',
    },
    {
      icon: Truck,
      title: 'Entrega e pagamento',
      desc: 'Defina entrega/retirada, taxa, bairros, pedido mínimo e PIX.',
      todo: 'Falta definir a entrega (endereço) e/ou a chave PIX.',
      done: deliveryDone,
      href: '/painel/configuracoes',
      cta: 'Configurar entrega',
    },
    {
      icon: Package,
      title: 'Seus produtos',
      desc: `Adicione pelo menos ${min} produtos. Use a biblioteca, a câmera ou importe por CSV.`,
      todo:
        productCount === 0
          ? `Falta adicionar produtos (0 de ${min}).`
          : `Faltam ${min - productCount} de ${min} produtos.`,
      done: productsDone,
      href: '/painel/produtos/novo',
      cta: 'Adicionar produtos',
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const pending = steps.filter((s) => !s.done)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Vamos montar sua loja</h1>
        <p className="text-sm text-neutral-500">
          {pending.length === 0
            ? 'Tudo pronto! É só publicar sua loja.'
            : `${doneCount} de ${steps.length} etapas concluídas — faltam ${pending.length} para publicar. Seu progresso fica salvo.`}
        </p>
      </div>

      {/* Resumo do que ainda falta — deixa claro cada pendência. */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Falta pouco para sua loja ir ao ar:</p>
          <ul className="mt-1.5 space-y-1">
            {pending.map((s) => (
              <li key={s.title} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {s.todo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card"
          >
            <div
              className={
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
                (s.done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
              }
            >
              {s.done ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-neutral-900">{s.title}</p>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                    (s.done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
                  }
                >
                  {s.done ? 'Concluído' : 'Pendente'}
                </span>
              </div>
              <p className="text-sm text-neutral-500">{s.desc}</p>
            </div>
            <Link href={s.href} className="shrink-0">
              <span className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
                {s.done ? 'Revisar' : s.cta}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-fg">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">Publicar</p>
            <p className="text-sm text-neutral-500">
              {canPublish
                ? 'Tudo pronto! Publique sua loja para começar a vender.'
                : `Adicione pelo menos ${min} produtos para liberar a publicação.`}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <OnboardingPublishButton canPublish={canPublish} />
        </div>
      </div>
    </div>
  )
}
