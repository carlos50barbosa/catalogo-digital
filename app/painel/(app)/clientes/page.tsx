import Link from 'next/link'
import { Users, Phone, MapPin, NotebookPen } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { listCustomers } from '@/lib/data/customers'
import { getFiadoAccess } from '@/lib/data/fiado'
import { formatDateTimeBR } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const { storeId } = await requireStore()
  const [customers, fiado] = await Promise.all([listCustomers(storeId), getFiadoAccess(storeId)])
  const fiadoOn = fiado.available

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Clientes</h1>
        <p className="text-sm text-neutral-500">
          Base de clientes que já pediram na sua loja (reconhecidos por telefone).
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <Users className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-medium text-neutral-700">Nenhum cliente ainda</p>
          <p className="text-sm text-neutral-500">Os clientes aparecem aqui após o primeiro pedido.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">{c.name}</p>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </span>
                  {c.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.address}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neutral-900">{c._count.orders}</p>
                <p className="text-[11px] text-neutral-400">
                  pedido(s){c.lastOrderAt ? ` · ${formatDateTimeBR(c.lastOrderAt)}` : ''}
                </p>
              </div>
              {fiadoOn && (
                <Link
                  href={`/painel/fiado/${c.id}`}
                  aria-label={`Fiado de ${c.name}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <NotebookPen className="h-4 w-4" /> Fiado
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
