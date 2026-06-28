import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ExternalLink } from 'lucide-react'
import { requireSuperadmin } from '@/lib/auth-helpers'
import { LogoutButton } from '@/components/admin/LogoutButton'

export const metadata: Metadata = {
  title: 'Plataforma',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // Barreira: somente SUPERADMIN. OWNER/STAFF são redirecionados.
  await requireSuperadmin()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <span className="font-display font-bold">Plataforma</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/painel"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" /> Painel da loja
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
