import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import { getStoreForPanel } from '@/lib/data/stores'
import { AdminShell } from '@/components/admin/AdminShell'
import { PanelStatusGate } from '@/components/admin/PanelStatusGate'
import { TrialBanner } from '@/components/admin/TrialBanner'
import { panelAccess, isTrialExpired } from '@/lib/store-status'
import { setStoreStatus } from '@/lib/data/billing'
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

  // Trial (sem cartão) vencido: rebaixa para PENDING (self-heal preguiçoso, pois
  // sem assinatura no gateway nenhum webhook faz isso) e manda assinar. Mantém o
  // trialEndsAt gravado para impedir um segundo período grátis.
  if (store && isTrialExpired(store.status, store.trialEndsAt)) {
    await setStoreStatus(session.storeId, 'PENDING')
    redirect('/cadastro/plano')
  }

  // Loja PENDING (self-service, ainda não pagou) não usa o painel — vai pro checkout.
  if (store?.status === 'PENDING') redirect('/cadastro/plano')

  const name = store?.name ?? 'Minha loja'
  const slug = store?.slug ?? session.storeSlug
  const accent = safeHexColor(store?.accentColor, config.defaultAccentColor)
  const access = panelAccess(store?.status ?? 'ACTIVE')

  // Loja ativa mas ainda não publicada → painel "travado" no onboarding:
  // as telas operacionais ficam desabilitadas no menu até a loja ir ao ar.
  const live = store?.status === 'ACTIVE' || store?.status === 'TRIALING'
  const locked = !!store && live && !store.published

  return (
    <div style={{ '--accent': accent } as React.CSSProperties}>
      <AdminShell storeName={name} storeSlug={slug} locked={locked}>
        <PanelStatusGate access={access} />
        {store?.status === 'TRIALING' && store.trialEndsAt && (
          <TrialBanner endsAt={store.trialEndsAt} />
        )}
        {children}
      </AdminShell>
    </div>
  )
}
