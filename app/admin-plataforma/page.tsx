import { Store, CheckCircle2, AlertTriangle, Ban, TrendingUp, Eye } from 'lucide-react'
import { requireSuperadmin } from '@/lib/auth-helpers'
import { listAllStoresForPlatform, platformStats } from '@/lib/data/billing'
import { decimalToNumber, formatBRL } from '@/lib/format'
import { PlatformTable, type PlatformRow } from '@/components/admin/PlatformTable'

export const dynamic = 'force-dynamic'

export default async function PlatformPage() {
  await requireSuperadmin()
  const [stores, stats] = await Promise.all([listAllStoresForPlatform(), platformStats()])

  // Conta quantas lojas usam cada CPF/CNPJ, para sinalizar repetição (não bloqueia).
  const cpfCount = new Map<string, number>()
  for (const s of stores) {
    const c = s.subscription?.cpfCnpj
    if (c) cpfCount.set(c, (cpfCount.get(c) ?? 0) + 1)
  }

  const rows: PlatformRow[] = stores.map((s) => {
    const cpf = s.subscription?.cpfCnpj ?? null
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      plan: s.plan,
      status: s.status,
      productCount: s._count.products,
      viewCount: s.viewCount,
      ownerEmail: s.users[0]?.email ?? null,
      createdAt: s.createdAt.toISOString(),
      nextDueDate: s.subscription?.nextDueDate ? s.subscription.nextDueDate.toISOString() : null,
      subValue: s.subscription ? decimalToNumber(s.subscription.value) : null,
      hasSubscription: !!s.subscription,
      cpfCnpj: cpf,
      cpfShared: !!(cpf && (cpfCount.get(cpf) ?? 0) > 1),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Lojas</h1>
        <p className="text-sm text-neutral-500">Gestão de assinaturas e status de todas as lojas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={<Store className="h-5 w-5" />} value={String(stats.total)} label="lojas" />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} value={String(stats.active)} label="ativas" tone="green" />
        <Stat icon={<AlertTriangle className="h-5 w-5" />} value={String(stats.pastDue)} label="em atraso" tone="amber" />
        <Stat icon={<Ban className="h-5 w-5" />} value={String(stats.suspended)} label="suspensas" tone="red" />
        <Stat icon={<TrendingUp className="h-5 w-5" />} value={formatBRL(stats.mrr)} label="MRR estimado" tone="green" />
        <Stat icon={<Eye className="h-5 w-5" />} value={stats.totalViews.toLocaleString('pt-BR')} label="visualizações" />
      </div>

      <PlatformTable rows={rows} />
    </div>
  )
}

function Stat({
  icon,
  value,
  label,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  value: string
  label: string
  tone?: 'neutral' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-600',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <p className="mt-2 font-display text-lg font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  )
}
