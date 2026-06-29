import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Truck, Package, MapPin, CreditCard, Phone, User } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getOrder } from '@/lib/data/orders'
import { getFiadoAccess, getFiadoEntryByOrder } from '@/lib/data/fiado'
import { Badge } from '@/components/ui/badge'
import { LaunchOrderFiadoButton } from '@/components/admin/LaunchOrderFiadoButton'
import {
  formatBRL,
  decimalToNumber,
  formatDateTimeBR,
  formatQtyWithUnit,
} from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { storeId } = await requireStore()
  const order = await getOrder(storeId, id) // escopado por storeId
  if (!order) notFound()

  const isDelivery = order.fulfillment === 'DELIVERY'

  // Fiado: oferece "lançar na conta" quando o recurso está disponível.
  const fiado = await getFiadoAccess(storeId)
  const fiadoLaunched = fiado.available ? !!(await getFiadoEntryByOrder(storeId, id)) : false

  return (
    <div className="space-y-5">
      <Link
        href="/painel/pedidos"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos pedidos
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Pedido</h1>
        <Badge tone="warning">Gerado</Badge>
        <span className="text-sm text-neutral-500">{formatDateTimeBR(order.createdAt)}</span>
      </div>

      {/* Cliente / entrega */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="mb-2 text-sm font-medium text-neutral-700">Cliente</p>
          <p className="flex items-center gap-2 text-sm text-neutral-800">
            <User className="h-4 w-4 text-neutral-400" /> {order.customerName}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
            <Phone className="h-4 w-4 text-neutral-400" /> {order.customerPhone}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="mb-2 text-sm font-medium text-neutral-700">Entrega</p>
          <p className="flex items-center gap-2 text-sm text-neutral-800">
            {isDelivery ? <Truck className="h-4 w-4 text-neutral-400" /> : <Package className="h-4 w-4 text-neutral-400" />}
            {isDelivery ? 'Entrega' : 'Retirada'}
          </p>
          {isDelivery && order.address && (
            <p className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
              <MapPin className="h-4 w-4 text-neutral-400" /> {order.address}
            </p>
          )}
          <p className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
            <CreditCard className="h-4 w-4 text-neutral-400" /> {order.paymentMethod}
          </p>
        </div>
      </div>

      {/* Itens */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <ul className="divide-y divide-neutral-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{it.name}</p>
                <p className="text-xs text-neutral-500">
                  {formatQtyWithUnit(decimalToNumber(it.quantity), it.unit)} ×{' '}
                  {formatBRL(decimalToNumber(it.unitPrice))}
                  {it.isEstimated && ' (aprox.)'}
                </p>
              </div>
              <span className="text-sm font-semibold text-neutral-900">
                {formatBRL(decimalToNumber(it.lineTotal))}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-neutral-200 p-4 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{formatBRL(decimalToNumber(order.subtotal))}</span>
          </div>
          {isDelivery && (
            <div className="flex justify-between text-neutral-600">
              <span>Taxa de entrega</span>
              <span>{formatBRL(decimalToNumber(order.deliveryFee))}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-200 pt-1 font-bold text-neutral-900">
            <span>Total</span>
            <span>{formatBRL(decimalToNumber(order.total))}</span>
          </div>
        </div>
      </div>

      {/* Fiado: lançar o total do pedido na conta do cliente */}
      {fiado.available && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="mb-1 text-sm font-medium text-neutral-700">Fiado</p>
          <p className="mb-3 text-xs text-neutral-500">
            Registre este pedido na caderneta do cliente como uma compra fiada (débito de{' '}
            {formatBRL(decimalToNumber(order.total))}).
          </p>
          <LaunchOrderFiadoButton
            orderId={order.id}
            customerId={order.customerId}
            alreadyLaunched={fiadoLaunched}
          />
        </div>
      )}
    </div>
  )
}
