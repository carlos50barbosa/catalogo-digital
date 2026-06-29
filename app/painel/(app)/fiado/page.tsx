import Link from 'next/link'
import { Settings, Wallet, Users as UsersIcon, AlertTriangle, NotebookPen } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getFiadoAccess, listFiadoDebtors, fiadoOverviewFromDebtors } from '@/lib/data/fiado'
import { formatBRL } from '@/lib/format'
import { FiadoUpsell } from '@/components/admin/FiadoUpsell'
import { FiadoDebtorList } from '@/components/admin/FiadoDebtorList'

export const dynamic = 'force-dynamic'

export default async function FiadoOverviewPage() {
  const { storeId } = await requireStore()
  const access = await getFiadoAccess(storeId)

  if (!access.planAllows) return <FiadoUpsell />

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Fiado</h1>
        <p className="text-sm text-neutral-500">Sua caderneta digital — saldos, atrasos e cobrança.</p>
      </div>
      <Link
        href="/painel/fiado/configuracoes"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <Settings className="h-4 w-4" /> Configurações
      </Link>
    </div>
  )

  if (!access.storeEnabled) {
    return (
      <div className="space-y-5">
        {header}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-medium text-amber-800">
            <AlertTriangle className="h-5 w-5" /> O fiado está desativado nesta loja.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Ative em{' '}
            <Link href="/painel/fiado/configuracoes" className="font-semibold underline">
              Configurações de fiado
            </Link>{' '}
            para começar a registrar dívidas e pagamentos.
          </p>
        </div>
      </div>
    )
  }

  const debtors = await listFiadoDebtors(storeId)
  const overview = fiadoOverviewFromDebtors(debtors)
  const storeName = access.store?.name ?? ''
  const reminderTemplate = access.settings?.fiadoReminderTemplate ?? null

  return (
    <div className="space-y-5">
      {header}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          value={formatBRL(overview.totalReceivable)}
          label="total a receber"
        />
        <StatCard
          icon={<UsersIcon className="h-5 w-5" />}
          value={String(overview.debtorCount)}
          label="clientes devendo"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          value={formatBRL(overview.totalOverdue)}
          label={`em atraso (${overview.overdueCount})`}
          tone="danger"
        />
      </div>

      <p className="flex items-center gap-2 text-sm text-neutral-500">
        <NotebookPen className="h-4 w-4 text-neutral-400" />
        Para lançar uma nova compra, abra a ficha do cliente em{' '}
        <Link href="/painel/clientes" className="font-medium text-accent hover:underline">
          Clientes
        </Link>{' '}
        ou no detalhe de um pedido.
      </p>

      <FiadoDebtorList debtors={debtors} storeName={storeName} reminderTemplate={reminderTemplate} />
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  value: string
  label: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
        }`}
      >
        {icon}
      </div>
      <p className="mt-3 font-display text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  )
}
