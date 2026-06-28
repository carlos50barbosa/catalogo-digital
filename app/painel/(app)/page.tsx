import Link from 'next/link'
import {
  Package,
  Tags,
  Upload,
  Settings,
  ExternalLink,
  ShoppingBag,
  Users,
  QrCode,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { getOrderStats } from '@/lib/data/orders'
import { CopyButton } from '@/components/admin/CopyButton'
import { formatBRL } from '@/lib/format'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

const SHORTCUTS = [
  { href: '/painel/pedidos', label: 'Pedidos', desc: 'Veja os pedidos gerados', icon: ShoppingBag },
  { href: '/painel/produtos', label: 'Produtos', desc: 'Cadastre e edite', icon: Package },
  { href: '/painel/clientes', label: 'Clientes', desc: 'Sua base de clientes', icon: Users },
  { href: '/painel/categorias', label: 'Categorias', desc: 'Organize o catálogo', icon: Tags },
  { href: '/painel/divulgacao', label: 'Divulgação', desc: 'QR Code da loja', icon: QrCode },
  { href: '/painel/importar', label: 'Importar CSV', desc: 'Vários de uma vez', icon: Upload },
  { href: '/painel/configuracoes', label: 'Configurações', desc: 'Loja, entrega, PIX', icon: Settings },
]

export default async function DashboardPage() {
  const { storeId, name } = await requireStore()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [store, totalProducts, stats] = await Promise.all([
    getStoreForPanel(storeId),
    countProducts(storeId),
    getOrderStats(storeId, since),
  ])
  const slug = store?.slug ?? ''
  const publicUrl = `${config.appUrl}/${slug}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Olá! 👋</h1>
        <p className="text-neutral-500">Bem-vindo ao painel de {name}.</p>
      </div>

      {/* Estatísticas de pedidos GERADOS (últimos 30 dias) */}
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-500">Últimos 30 dias (pedidos gerados)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} value={String(stats.count)} label="pedidos gerados" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} value={formatBRL(stats.totalValue)} label="valor gerado" />
          <StatCard icon={<Receipt className="h-5 w-5" />} value={formatBRL(stats.averageTicket)} label="ticket médio" />
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          “Gerado” = pedido enviado ao WhatsApp; a confirmação é feita pela loja.
        </p>
      </div>

      {/* Link público */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <p className="text-sm font-medium text-neutral-700">Link da sua loja</p>
        <p className="mt-1 break-all font-mono text-sm text-accent">{publicUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton value={publicUrl} label="Copiar link" />
          <Link
            href={`/${slug}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <ExternalLink className="h-4 w-4" /> Ver minha loja
          </Link>
          <span className="inline-flex h-9 items-center rounded-lg bg-neutral-100 px-3 text-sm text-neutral-500">
            {totalProducts} produtos
          </span>
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card transition hover:border-neutral-300"
          >
            <s.icon className="h-6 w-6 text-green-600" />
            <p className="mt-3 font-semibold text-neutral-900">{s.label}</p>
            <p className="text-xs text-neutral-500">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
        {icon}
      </div>
      <p className="mt-3 font-display text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  )
}
