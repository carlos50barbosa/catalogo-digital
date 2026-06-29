import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Phone,
  AlertTriangle,
  Receipt,
  Undo2,
} from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getCustomer } from '@/lib/data/customers'
import {
  getFiadoAccess,
  getFiadoAccountByCustomer,
  listFiadoEntries,
} from '@/lib/data/fiado'
import { decimalToNumber, formatBRL, formatDateTimeBR } from '@/lib/format'
import { buildFiadoReminderMessage, buildFiadoReminderUrl } from '@/lib/fiado/buildReminderMessage'
import { Badge } from '@/components/ui/badge'
import { FiadoUpsell } from '@/components/admin/FiadoUpsell'
import { FiadoCustomerPanel } from '@/components/admin/FiadoCustomerPanel'
import { ReverseEntryButton } from '@/components/admin/ReverseEntryButton'

export const dynamic = 'force-dynamic'

function formatDateBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso))
}

export default async function FiadoCustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const { storeId } = await requireStore()
  const access = await getFiadoAccess(storeId)

  if (!access.planAllows) return <FiadoUpsell />

  const customer = await getCustomer(storeId, customerId)
  if (!customer) notFound()

  const back = (
    <Link
      href="/painel/fiado"
      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
    >
      <ArrowLeft className="h-4 w-4" /> Voltar ao fiado
    </Link>
  )

  if (!access.storeEnabled) {
    return (
      <div className="space-y-5">
        {back}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-medium text-amber-800">
            <AlertTriangle className="h-5 w-5" /> O fiado está desativado nesta loja.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Ative em{' '}
            <Link href="/painel/fiado/configuracoes" className="font-semibold underline">
              Configurações de fiado
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  const account = await getFiadoAccountByCustomer(storeId, customerId)
  const balance = account ? decimalToNumber(account.balance) : 0
  const defaultLimit = access.settings
    ? decimalToNumber(access.settings.fiadoDefaultCreditLimit)
    : 0
  const creditLimit = account ? decimalToNumber(account.creditLimit) : defaultLimit
  const status = account?.status ?? 'ACTIVE'
  const entries = account ? await listFiadoEntries(storeId, account.id) : []

  const reminderUrl = buildFiadoReminderUrl(
    customer.phone,
    buildFiadoReminderMessage({
      customerName: customer.name,
      storeName: access.store?.name ?? '',
      balance,
      template: access.settings?.fiadoReminderTemplate ?? null,
    }),
  )

  return (
    <div className="space-y-5">
      {back}

      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">{customer.name}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
          <Phone className="h-3.5 w-3.5" /> {customer.phone}
        </p>
      </div>

      <FiadoCustomerPanel
        customerId={customerId}
        balance={balance}
        creditLimit={creditLimit}
        status={status}
        reminderUrl={reminderUrl}
      />

      {/* Extrato (imutável) */}
      <div>
        <h2 className="mb-2 font-display text-lg font-bold text-neutral-900">Extrato</h2>
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <Receipt className="mx-auto h-7 w-7 text-neutral-300" />
            <p className="mt-2 font-medium text-neutral-700">Nenhum lançamento ainda</p>
            <p className="text-sm text-neutral-500">
              Use “Lançar compra” acima para registrar a primeira dívida.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            {entries.map((e) => {
              const isDebit = e.type === 'DEBIT'
              return (
                <li key={e.id} className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isDebit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {isDebit ? (
                      <ArrowUpCircle className="h-5 w-5" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900">
                        {isDebit ? 'Compra' : 'Pagamento'}
                      </span>
                      {e.isReversal && (
                        <Badge tone="neutral" className="px-1.5 py-0">
                          <Undo2 className="h-3 w-3" /> Estorno
                        </Badge>
                      )}
                      {e.reversed && (
                        <Badge tone="warning" className="px-1.5 py-0">
                          Estornado
                        </Badge>
                      )}
                    </div>
                    {e.description && (
                      <p className="truncate text-sm text-neutral-600">{e.description}</p>
                    )}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-400">
                      <span>{formatDateTimeBR(e.createdAt)}</span>
                      {e.createdByName && <span>· por {e.createdByName}</span>}
                      {isDebit && e.dueDate && <span>· vence {formatDateBR(e.dueDate)}</span>}
                      {e.orderId && (
                        <Link
                          href={`/painel/pedidos/${e.orderId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          · ver pedido
                        </Link>
                      )}
                    </p>
                    {!e.isReversal && !e.reversed && (
                      <div className="mt-1">
                        <ReverseEntryButton entryId={e.id} />
                      </div>
                    )}
                  </div>

                  <span
                    className={`shrink-0 font-display font-bold ${
                      e.reversed ? 'text-neutral-400 line-through' : isDebit ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {isDebit ? '+' : '−'}
                    {formatBRL(e.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
