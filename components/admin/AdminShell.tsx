'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Tags,
  Upload,
  Settings,
  ExternalLink,
  Store as StoreIcon,
  ShoppingBag,
  Users,
  QrCode,
} from 'lucide-react'
import { LogoutButton } from './LogoutButton'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/painel', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/painel/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/painel/produtos', label: 'Produtos', icon: Package },
  { href: '/painel/categorias', label: 'Categorias', icon: Tags },
  { href: '/painel/clientes', label: 'Clientes', icon: Users },
  { href: '/painel/importar', label: 'Importar', icon: Upload },
  { href: '/painel/divulgacao', label: 'Divulgação', icon: QrCode },
  { href: '/painel/configuracoes', label: 'Config', icon: Settings },
]

// No mobile o menu inferior mostra só os principais (5 colunas).
const PRIMARY = new Set([
  '/painel',
  '/painel/pedidos',
  '/painel/produtos',
  '/painel/clientes',
  '/painel/configuracoes',
])

export function AdminShell({
  storeName,
  storeSlug,
  children,
}: {
  storeName: string
  storeSlug: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white">
            <StoreIcon className="h-5 w-5" />
          </div>
          <span className="font-display font-bold text-neutral-900">Catálogo</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive(item.href, item.exact)
                  ? 'bg-green-50 text-green-700'
                  : 'text-neutral-600 hover:bg-neutral-100',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={`/${storeSlug}`}
          target="_blank"
          className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          <ExternalLink className="h-4 w-4" /> Ver minha loja
        </Link>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white lg:pl-60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display font-bold text-neutral-900">{storeName}</p>
            <p className="text-xs text-neutral-500">/{storeSlug}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/${storeSlug}`}
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 lg:hidden"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Ver loja</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-5 pb-24 lg:pb-8 lg:pl-60">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white lg:hidden">
        <ul className="grid grid-cols-5">
          {NAV.filter((item) => PRIMARY.has(item.href)).map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                    active ? 'text-green-700' : 'text-neutral-500',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
