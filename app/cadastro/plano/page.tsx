import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PlanoForm } from '@/components/signup/PlanoForm'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function PlanoPage() {
  const session = await auth()
  if (!session?.user?.storeId || !session.user.email) redirect('/painel/login')

  const [user, store] = await Promise.all([
    prisma.user.findUnique({ where: { email: session.user.email }, select: { emailVerified: true } }),
    prisma.store.findUnique({
      where: { id: session.user.storeId },
      select: { status: true, subscription: { select: { id: true } } },
    }),
  ])

  if (!user?.emailVerified) redirect('/cadastro/verificar-email')
  if (store?.status === 'ACTIVE') redirect('/painel')
  if (store?.subscription) redirect('/cadastro/aguardando') // já escolheu, aguardando pagamento

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-900">Escolha seu plano</h1>
          <p className="mt-1 text-neutral-500">
            Mensalidade fixa, sem comissão por venda. Cancele quando quiser.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <PlanoForm setupFee={config.setupFee} />
        </div>
      </div>
    </main>
  )
}
