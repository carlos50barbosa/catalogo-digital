import Link from 'next/link'
import { ShoppingBag, ChevronRight, Truck, Package, Phone } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { listOrders } from '@/lib/data/orders'
import { Badge } from '@/components/ui/badge'
import { formatBRL, decimalToNumber, formatDateTimeBR } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const { storeId } = await requireStore()
  const orders = await listOrders(storeId)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Pedidos gerados</h1>
        <p className="text-sm text-neutral-500">
          Pedidos enviados ao WhatsApp. A confirmação é feita por você na conversa.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-medium text-neutral-700">Nenhum pedido ainda</p>
          <p className="text-sm text-neutral-500">Os pedidos gerados na vitrine aparecem aqui.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/painel/pedidos/${o.id}`}
                className="flex items-center gap-3 p-4 hover:bg-neutral-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  {o.fulfillment === 'DELIVERY' ? <Truck className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900">{o.customerName}</p>
                    <Badge tone="neutral">{o.fulfillment === 'DELIVERY' ? 'Entrega' : 'Retirada'}</Badge>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-neutral-500">
                    <Phone className="h-3 w-3" /> {o.customerPhone} · {o._count.items} item(s) ·{' '}
                    {formatDateTimeBR(o.createdAt)}
                  </p>
                </div>
                <span className="font-display font-bold text-neutral-900">
                  {formatBRL(decimalToNumber(o.total))}
                </span>
                <ChevronRight className="h-5 w-5 text-neutral-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
