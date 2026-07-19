import { notFound } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel } from '@/lib/data/stores'
import { listOptionGroups } from '@/lib/data/option-groups'
import { hasOptions } from '@/lib/segment'
import { decimalToNumber } from '@/lib/format'
import { OptionGroupManager, type AdminGroup } from '@/components/admin/OptionGroupManager'

export const dynamic = 'force-dynamic'

export default async function ComplementosPage() {
  const { storeId } = await requireStore()
  const store = await getStoreForPanel(storeId)

  // A TELA é escondida do mercadinho (o painel dele fica simples). A regra de
  // dados não olha segmento: complementos já criados continuam valendo se o
  // dono trocar o ramo. Ver lib/segment.ts.
  if (!hasOptions(store?.segment)) notFound()

  const groups = await listOptionGroups(storeId)
  const initial: AdminGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    productCount: g._count.products,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceDelta: decimalToNumber(o.priceDelta),
      defaultSelected: o.defaultSelected,
      isAvailable: o.isAvailable,
    })),
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Complementos</h1>
        <p className="text-sm text-neutral-500">
          Adicionais e escolhas dos seus itens. Crie o grupo uma vez e use em vários lanches.
        </p>
      </div>
      <OptionGroupManager initial={initial} />
    </div>
  )
}
