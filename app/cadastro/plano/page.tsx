import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { PlanoForm } from '@/components/signup/PlanoForm'
import { StartTrialButton } from '@/components/signup/StartTrialButton'
import { LogoutButton } from '@/components/admin/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function PlanoPage() {
  const session = await auth()
  if (!session?.user?.storeId || !session.user.email) redirect('/painel/login')

  const [user, store] = await Promise.all([
    prisma.user.findUnique({ where: { email: session.user.email }, select: { emailVerified: true } }),
    prisma.store.findUnique({
      where: { id: session.user.storeId },
      select: { status: true, trialEndsAt: true, subscription: { select: { id: true } } },
    }),
  ])

  if (!user?.emailVerified) redirect('/cadastro/verificar-email')
  if (store?.status === 'ACTIVE') redirect('/painel')
  if (store?.subscription) redirect('/cadastro/aguardando') // já escolheu, aguardando pagamento

  // Teste grátis (sem cartão): só para quem ainda não usou trial nem assinou.
  const canTrial =
    config.signup.trialDays > 0 && store?.status === 'PENDING' && !store.trialEndsAt

  // Já usou o teste e está sem plano: explica por que caiu aqui (senão a pessoa
  // é jogada na tela de planos sem contexto e acha que "travou").
  const trialOver = store?.status === 'PENDING' && !!store.trialEndsAt
  const trialEndLabel =
    store?.trialEndsAt && store.trialEndsAt.getTime() < Date.now()
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(store.trialEndsAt)
      : null

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-end">
          <LogoutButton />
        </div>

        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-900">
            {trialOver ? 'Reative sua loja' : 'Escolha seu plano'}
          </h1>
          <p className="mt-1 text-neutral-500">
            {trialOver
              ? 'Escolha um plano para colocar sua loja de volta no ar.'
              : 'Mensalidade fixa, sem comissão por venda. Cancele quando quiser.'}
          </p>
        </div>

        {trialOver && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-amber-900">
              <Clock className="h-5 w-5 shrink-0" /> Seu teste grátis terminou
            </p>
            <p className="mt-1.5 text-sm text-amber-800">
              O período de teste da sua loja{' '}
              {trialEndLabel ? <>terminou em <strong>{trialEndLabel}</strong>.</> : 'foi encerrado.'}{' '}
              Enquanto não houver um plano ativo, <strong>sua loja fica fora do ar</strong> para os
              clientes e o painel fica bloqueado.
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Fique tranquilo: <strong>nada foi apagado</strong>. Seus produtos, clientes, pedidos e a
              caderneta de fiado continuam salvos e voltam no ar assim que você escolher um plano
              abaixo.
            </p>
          </div>
        )}

        {canTrial && (
          <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/5 p-5 shadow-card">
            <p className="font-display text-lg font-bold text-neutral-900">
              Experimente antes de pagar
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Monte sua loja e teste tudo por {config.signup.trialDays} dias grátis, sem cartão. Só
              escolha um plano quando decidir continuar.
            </p>
            <div className="mt-4">
              <StartTrialButton trialDays={config.signup.trialDays} />
            </div>
          </div>
        )}

        {canTrial && (
          <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            ou assine já
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <PlanoForm />
        </div>
      </div>
    </main>
  )
}
