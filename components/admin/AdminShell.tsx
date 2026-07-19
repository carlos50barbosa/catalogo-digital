'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Tags,
  Upload,
  Settings,
  ExternalLink,
  ShoppingBag,
  Users,
  QrCode,
  CreditCard,
  NotebookPen,
  BarChart3,
  Rocket,
  MoreHorizontal,
} from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { LogoutButton } from './LogoutButton'
import { cn } from '@/lib/utils'
import { segmentCopy } from '@/lib/segment'
import type { StoreSegment } from '@/lib/types'

const NAV = [
  { href: '/painel', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/painel/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/painel/produtos', label: 'Produtos', icon: Package },
  { href: '/painel/categorias', label: 'Categorias', icon: Tags },
  { href: '/painel/clientes', label: 'Clientes', icon: Users },
  { href: '/painel/fiado', label: 'Fiado', icon: NotebookPen },
  { href: '/painel/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/painel/importar', label: 'Importar', icon: Upload },
  { href: '/painel/divulgacao', label: 'Divulgação', icon: QrCode },
  { href: '/painel/assinatura', label: 'Meu plano', icon: CreditCard },
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

// Telas "operacionais" que ficam OCULTAS enquanto a loja não foi publicada
// (não fazem sentido no onboarding — pedido/cliente/divulgação de loja no ar).
const LOCKED_HREFS = new Set([
  '/painel/pedidos',
  '/painel/clientes',
  '/painel/fiado',
  '/painel/relatorios',
  '/painel/divulgacao',
])

// No mobile, quando travado, mostramos as telas de setup.
const PRIMARY_LOCKED = new Set([
  '/painel/onboarding',
  '/painel/produtos',
  '/painel/categorias',
  '/painel/importar',
  '/painel/configuracoes',
])

export function AdminShell({
  storeName,
  storeSlug,
  segment,
  locked = false,
  children,
}: {
  storeName: string
  storeSlug: string
  segment: StoreSegment
  locked?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  // Travado (onboarding): oculta as telas operacionais e troca a 1ª entrada
  // ("Início") por "Onboarding" (o hub do cadastro).
  const baseNav = locked
    ? NAV.filter((i) => !LOCKED_HREFS.has(i.href)).map((i) =>
        i.href === '/painel'
          ? { href: '/painel/onboarding', label: 'Onboarding', icon: Rocket, exact: true }
          : i,
      )
    : NAV

  // "Produtos" vira "Cardápio" na lanchonete — a rota é a mesma.
  const itemsLabel = segmentCopy(segment).itemsLabel
  const navItems = baseNav.map((i) =>
    i.href === '/painel/produtos' ? { ...i, label: itemsLabel } : i,
  )
  const primarySet = locked ? PRIMARY_LOCKED : PRIMARY

  // Mobile: 4 abas principais + botão "Mais" (que abre o menu completo).
  const mobileTabs = navItems.filter((item) => primarySet.has(item.href)).slice(0, 4)
  const onMoreSection = !mobileTabs.some((item) => isActive(item.href, item.exact))

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="font-display font-bold text-neutral-900">Catálogo</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
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
        {/* Loja só é visível ao público depois de publicada — no onboarding o link levaria a "página não encontrada". */}
        {!locked && (
          <Link
            href={`/${storeSlug}`}
            target="_blank"
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <ExternalLink className="h-4 w-4" /> Ver minha loja
          </Link>
        )}
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white lg:pl-60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display font-bold text-neutral-900">{storeName}</p>
            <p className="text-xs text-neutral-500">/{storeSlug}</p>
          </div>
          <div className="flex items-center gap-1">
            {!locked && (
              <Link
                href={`/${storeSlug}`}
                target="_blank"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 lg:hidden"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Ver loja</span>
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-5 pb-24 lg:pb-8 lg:pl-60">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      {/* Bottom nav (mobile): 4 abas + "Mais" */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white lg:hidden">
        <ul className="grid grid-cols-5">
          {mobileTabs.map((item) => {
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
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                onMoreSection ? 'text-green-700' : 'text-neutral-500',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {/* Menu completo (mobile) — abre pelo "Mais" */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <nav className="p-2">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                  active ? 'bg-green-50 text-green-700' : 'text-neutral-700 hover:bg-neutral-100',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
          {!locked && (
            <Link
              href={`/${storeSlug}`}
              target="_blank"
              onClick={() => setMoreOpen(false)}
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <ExternalLink className="h-5 w-5" /> Ver minha loja
            </Link>
          )}
        </nav>
      </Sheet>
    </div>
  )
}
