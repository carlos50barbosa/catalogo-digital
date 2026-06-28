import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel } from '@/lib/data/stores'
import { serializeSettings } from '@/lib/serialize'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { storeId } = await requireStore()
  const store = await getStoreForPanel(storeId)
  const settings = serializeSettings(store?.settings ?? null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Configurações</h1>
        <p className="text-sm text-neutral-500">Ajuste sua loja, entrega, pagamento e horários.</p>
      </div>
      <SettingsForm
        initial={{
          name: store?.name ?? '',
          logoUrl: store?.logoUrl ?? null,
          whatsappNumber: store?.whatsappNumber ?? '',
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
    </div>
  )
}
