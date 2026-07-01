import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel } from '@/lib/data/stores'
import { serializeSettings } from '@/lib/serialize'
import { can } from '@/lib/plans'
import { stripBrDdi } from '@/lib/utils'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { DeleteStoreZone } from '@/components/admin/DeleteStoreZone'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { storeId } = await requireStore()
  const store = await getStoreForPanel(storeId)
  const settings = serializeSettings(store?.settings ?? null)
  const canCustomMessage = store ? can(store.plan, 'customMessage') : false

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Configurações</h1>
        <p className="text-sm text-neutral-500">Ajuste sua loja, entrega, pagamento e horários.</p>
      </div>
      <SettingsForm
        canCustomMessage={canCustomMessage}
        initial={{
          name: store?.name ?? '',
          logoUrl: store?.logoUrl ?? null,
          whatsappNumber: stripBrDdi(store?.whatsappNumber ?? ''),
          accentColor: store?.accentColor ?? null,
          address: settings.address,
          deliveryFee: settings.deliveryFee,
          minOrderValue: settings.minOrderValue,
          pixKey: settings.pixKey,
          fulfillment: settings.fulfillment,
          deliveryZones: settings.deliveryZones,
          openingHours: settings.openingHours,
          showOutOfStock: settings.showOutOfStock,
          orderMessageTemplate: settings.orderMessageTemplate,
        }}
      />

      <DeleteStoreZone storeName={store?.name ?? 'sua loja'} />
    </div>
  )
}
