import type { Metadata } from 'next'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel } from '@/lib/data/stores'
import { AdminShell } from '@/components/admin/AdminShell'
import { safeHexColor } from '@/lib/utils'
import { config } from '@/lib/config'

// Painel não deve ser indexado.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Barreira de autenticação: storeId vem SEMPRE da sessão.
  const session = await requireStore()
  const store = await getStoreForPanel(session.storeId)

  const name = store?.name ?? 'Minha loja'
  const slug = store?.slug ?? session.storeSlug
  const accent = safeHexColor(store?.accentColor, config.defaultAccentColor)

  return (
    <div style={{ '--accent': accent } as React.CSSProperties}>
      <AdminShell storeName={name} storeSlug={slug}>
        {children}
      </AdminShell>
    </div>
  )
}
