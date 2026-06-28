import Link from 'next/link'
import { Package, Tags, Upload, Settings, ExternalLink, Boxes } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { CopyButton } from '@/components/admin/CopyButton'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

const SHORTCUTS = [
  { href: '/painel/produtos', label: 'Produtos', desc: 'Cadastre e edite', icon: Package },
  { href: '/painel/categorias', label: 'Categorias', desc: 'Organize o catálogo', icon: Tags },
  { href: '/painel/importar', label: 'Importar CSV', desc: 'Vários de uma vez', icon: Upload },
  { href: '/painel/configuracoes', label: 'Configurações', desc: 'Loja, entrega, PIX', icon: Settings },
]

export default async function DashboardPage() {
  const { storeId, name } = await requireStore()
  const [store, total] = await Promise.all([getStoreForPanel(storeId), countProducts(storeId)])
  const slug = store?.slug ?? ''
  const publicUrl = `${config.appUrl}/${slug}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Olá! 👋</h1>
        <p className="text-neutral-500">Bem-vindo ao painel de {name}.</p>
      </div>

      {/* Link público da loja */}
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
        </div>
      </div>

      {/* Estatística simples */}
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <Boxes className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-neutral-900">{total}</p>
          <p className="text-sm text-neutral-500">produtos cadastrados</p>
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
