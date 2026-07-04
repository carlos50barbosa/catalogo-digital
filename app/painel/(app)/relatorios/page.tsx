import Link from 'next/link'
import { BarChart3, ShoppingBag, TrendingUp, Receipt, Package, NotebookPen } from 'lucide-react'
import { requireOnboardedStore } from '@/lib/auth-helpers'
import {
  getSalesSummary,
  getSalesSeries,
  getItemsReport,
  type SalesBucket,
} from '@/lib/data/reports'
import { getFiadoAccess, listFiadoDebtors, fiadoOverviewFromDebtors } from '@/lib/data/fiado'
import { formatBRL, formatQtyWithUnit } from '@/lib/format'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ---------- Períodos ----------

type PeriodKey = '7d' | '30d' | '90d' | 'mes' | 'mes-passado'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'mes', label: 'Este mês' },
  { key: 'mes-passado', label: 'Mês passado' },
]

function normalizePeriod(v: string | undefined): PeriodKey {
  return PERIODS.some((p) => p.key === v) ? (v as PeriodKey) : '30d'
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Resolve o período em [since, until) + granularidade + descrição legível. */
function resolvePeriod(key: PeriodKey): {
  since: Date
  until: Date
  granularity: 'day' | 'week'
  description: string
} {
  const now = new Date()
  const today = startOfDay(now)

  if (key === 'mes') {
    return {
      since: new Date(now.getFullYear(), now.getMonth(), 1),
      until: now,
      granularity: 'day',
      description: 'Do dia 1º até hoje',
    }
  }
  if (key === 'mes-passado') {
    return {
      since: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      until: new Date(now.getFullYear(), now.getMonth(), 1),
      granularity: 'day',
      description: 'Mês anterior completo',
    }
  }
  const days = key === '7d' ? 7 : key === '90d' ? 90 : 30
  const since = new Date(today)
  since.setDate(since.getDate() - (days - 1))
  return {
    since,
    until: now,
    granularity: days > 31 ? 'week' : 'day',
    description: `Últimos ${days} dias`,
  }
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

// ---------- Página ----------

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const { storeId } = await requireOnboardedStore()
  const sp = await searchParams
  const period = normalizePeriod(sp.periodo)
  const { since, until, granularity, description } = resolvePeriod(period)

  const fiado = await getFiadoAccess(storeId)

  const [summary, series, items, debtors] = await Promise.all([
    getSalesSummary(storeId, since, until),
    getSalesSeries(storeId, since, until, granularity),
    getItemsReport(storeId, since, until),
    fiado.available ? listFiadoDebtors(storeId) : Promise.resolve(null),
  ])

  const fiadoOverview = debtors ? fiadoOverviewFromDebtors(debtors) : null
  const hasSales = summary.count > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Relatórios</h1>
        <p className="text-sm text-neutral-500">
          Baseado nos pedidos <strong>gerados</strong> (enviados ao WhatsApp) no período.
        </p>
      </div>

      {/* Seletor de período (links — sem JS de cliente) */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/painel/relatorios?periodo=${p.key}`}
            className={cn(
              'inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition',
              p.key === period
                ? 'bg-green-600 text-white'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50',
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Resumo de vendas */}
      <section>
        <p className="mb-2 text-sm font-medium text-neutral-500">Vendas · {description}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} value={String(summary.count)} label="pedidos" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} value={formatBRL(summary.revenue)} label="faturamento" />
          <StatCard icon={<Receipt className="h-5 w-5" />} value={formatBRL(summary.averageTicket)} label="ticket médio" />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} value={formatBRL(summary.deliveryFee)} label="taxas de entrega" />
        </div>
      </section>

      {!hasSales ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-medium text-neutral-700">Sem vendas neste período</p>
          <p className="text-sm text-neutral-500">Escolha outro período ou aguarde novos pedidos.</p>
        </div>
      ) : (
        <>
          {/* Gráfico de faturamento */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
            <p className="mb-4 text-sm font-medium text-neutral-700">
              Faturamento por {granularity === 'week' ? 'semana' : 'dia'}
            </p>
            <SalesChart buckets={series} />
          </section>

          {/* Produtos mais vendidos */}
          <section>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-500">
              <Package className="h-4 w-4" /> Produtos mais vendidos
            </p>
            {items.topProducts.length === 0 ? (
              <p className="rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
                Nenhum item vendido no período.
              </p>
            ) : (
              <ol className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
                {items.topProducts.map((p, i) => (
                  <li key={`${p.name}-${p.unit}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                      <p className="text-xs text-neutral-500">
                        {formatQtyWithUnit(p.quantity, p.unit)} vendidos
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-neutral-900">
                      {formatBRL(p.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Lucro (custo × venda) */}
          <section>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-500">
              <TrendingUp className="h-4 w-4" /> Lucro estimado (custo × venda)
            </p>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
              {items.profit.coveredRevenue === 0 ? (
                <p className="text-sm text-neutral-500">
                  Nenhum produto vendido tem <strong>custo</strong> cadastrado no período. Preencha o
                  custo dos produtos (ou importe por NF-e) para ver a margem.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Metric label="Receita (c/ custo)" value={formatBRL(items.profit.coveredRevenue)} />
                    <Metric label="Custo (CMV)" value={formatBRL(items.profit.cogs)} />
                    <Metric
                      label="Lucro bruto"
                      value={formatBRL(items.profit.grossProfit)}
                      accent={items.profit.grossProfit >= 0 ? 'pos' : 'neg'}
                    />
                    <Metric label="Margem" value={formatPct(items.profit.margin)} />
                    <Metric label="Cobertura" value={formatPct(items.profit.coverage)} />
                  </div>
                  {items.profit.coverage < 0.999 && (
                    <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      A margem considera só os itens com custo cadastrado ({formatPct(items.profit.coverage)} do
                      faturamento). {items.profit.itemsMissingCost} linha(s) de venda estão sem custo.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </>
      )}

      {/* Fiado / a receber (snapshot atual — não depende do período) */}
      {fiadoOverview && (
        <section>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-500">
            <NotebookPen className="h-4 w-4" /> Fiado a receber <span className="text-neutral-400">(hoje)</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<NotebookPen className="h-5 w-5" />} value={formatBRL(fiadoOverview.totalReceivable)} label="a receber" />
            <StatCard icon={<ShoppingBag className="h-5 w-5" />} value={String(fiadoOverview.debtorCount)} label="devedores" />
            <StatCard icon={<Receipt className="h-5 w-5" />} value={formatBRL(fiadoOverview.totalOverdue)} label="em atraso" tone={fiadoOverview.totalOverdue > 0 ? 'danger' : undefined} />
            <StatCard icon={<BarChart3 className="h-5 w-5" />} value={String(fiadoOverview.overdueCount)} label="contas atrasadas" tone={fiadoOverview.overdueCount > 0 ? 'danger' : undefined} />
          </div>
          <Link href="/painel/fiado" className="mt-2 inline-block text-sm font-medium text-green-700 hover:underline">
            Ver caderneta completa →
          </Link>
        </section>
      )}
    </div>
  )
}

// ---------- Blocos de UI (server components) ----------

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: string
  label: string
  tone?: 'danger'
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700',
        )}
      >
        {icon}
      </div>
      <p className="mt-3 font-display text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'pos' | 'neg'
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={cn(
          'font-display text-lg font-bold',
          accent === 'pos' && 'text-green-700',
          accent === 'neg' && 'text-red-600',
          !accent && 'text-neutral-900',
        )}
      >
        {value}
      </p>
    </div>
  )
}

/** Gráfico de barras em CSS puro (sem dependência). Altura relativa ao maior balde. */
function SalesChart({ buckets }: { buckets: SalesBucket[] }) {
  const max = Math.max(...buckets.map((b) => b.revenue), 1)
  // Muitas barras (ex.: 30 dias) ficam apertadas: escondemos rótulos alternados.
  const showEveryLabel = buckets.length <= 14
  return (
    <div className="flex h-44 items-end gap-1">
      {buckets.map((b, i) => {
        const heightPct = Math.round((b.revenue / max) * 100)
        return (
          <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-green-500/80 transition-all hover:bg-green-600"
                style={{ height: `${b.revenue > 0 ? Math.max(heightPct, 2) : 0}%` }}
                title={`${b.label}: ${formatBRL(b.revenue)} · ${b.count} pedido(s)`}
              />
            </div>
            <span className="w-full truncate text-center text-[9px] leading-none text-neutral-400">
              {showEveryLabel || i % 3 === 0 ? b.label : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
