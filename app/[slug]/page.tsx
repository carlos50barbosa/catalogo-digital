import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { getStoreBySlug, incrementStoreView } from '@/lib/data/stores'
import { listCategories } from '@/lib/data/categories'
import { listStorefrontProducts } from '@/lib/data/products'
import {
  serializeStore,
  serializeSettings,
  serializeCategory,
  serializeProduct,
} from '@/lib/serialize'
import { getOpenStatus } from '@/lib/store-hours'
import { isStorePublic, isSuspended } from '@/lib/store-status'
import { safeHexColor, uploadSrc, isBotUserAgent } from '@/lib/utils'
import { config } from '@/lib/config'
import { StorefrontClient } from '@/components/storefront/StorefrontClient'
import { StoreUnavailable } from '@/components/storefront/StoreUnavailable'

// Vitrine pública. Dinâmica (depende do slug e dos dados da loja em runtime).
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store || !isStorePublic(store.status, store.published)) return { title: 'Loja não encontrada' }

  const title = `${store.name} — Peça pelo WhatsApp`
  const description = `Faça seu pedido no ${store.name}: catálogo online com entrega e retirada, direto pelo WhatsApp.`
  const url = `${config.appUrl}/${store.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      locale: 'pt_BR',
      images: store.logoUrl ? [{ url: `${config.appUrl}${uploadSrc(store.logoUrl)}` }] : [],
    },
  }
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) notFound()
  if (isSuspended(store.status)) return <StoreUnavailable name={store.name} />
  if (!isStorePublic(store.status, store.published)) notFound() // PENDING/CANCELED/não publicada

  // Conta a visualização da vitrine (só visita humana). Fire-and-forget: não
  // adiciona latência nem quebra a página se a escrita falhar.
  const ua = (await headers()).get('user-agent')
  if (!isBotUserAgent(ua)) void incrementStoreView(store.id).catch(() => {})

  const settings = serializeSettings(store.settings)
  const [cats, prods] = await Promise.all([
    listCategories(store.id),
    listStorefrontProducts(store.id, { showOutOfStock: settings.showOutOfStock }),
  ])

  const sStore = serializeStore(store)
  const categories = cats.map(serializeCategory)
  const products = prods.map(serializeProduct)
  const openStatus = getOpenStatus(settings.openingHours)
  const accent = safeHexColor(store.accentColor, config.defaultAccentColor)

  // JSON-LD para SEO local (GroceryStore).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    name: store.name,
    telephone: `+${store.whatsappNumber}`,
    url: `${config.appUrl}/${store.slug}`,
    ...(settings.address ? { address: settings.address } : {}),
    ...(store.logoUrl ? { image: `${config.appUrl}${uploadSrc(store.logoUrl)}` } : {}),
  }

  return (
    // A cor de destaque da loja é injetada como CSS variable e herdada por toda a vitrine.
    <div style={{ '--accent': accent } as React.CSSProperties}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StorefrontClient
        store={sStore}
        settings={settings}
        categories={categories}
        products={products}
        openStatus={openStatus}
      />
    </div>
  )
}
