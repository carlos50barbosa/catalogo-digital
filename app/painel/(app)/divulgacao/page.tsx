import { requireOnboardedStore } from '@/lib/auth-helpers'
import { getStoreForPanel } from '@/lib/data/stores'
import { QrPoster } from '@/components/admin/QrPoster'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function DivulgacaoPage() {
  const { storeId } = await requireOnboardedStore()
  const store = await getStoreForPanel(storeId)
  const slug = store?.slug ?? ''
  const url = `${config.appUrl}/${slug}`

  return (
    <div className="space-y-5">
      <div className="no-print">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Divulgação</h1>
        <p className="text-sm text-neutral-500">
          Imprima o QR Code e cole no balcão. O cliente aponta a câmera e abre sua loja.
        </p>
      </div>

      <QrPoster url={url} storeName={store?.name ?? 'Minha loja'} logoUrl={store?.logoUrl ?? null} />
    </div>
  )
}
