import { redirect } from 'next/navigation'
import { Loader2, Clock } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AguardandoPoller } from '@/components/signup/AguardandoPoller'

export const dynamic = 'force-dynamic'

export default async function AguardandoPage() {
  const session = await auth()
  if (!session?.user?.storeId) redirect('/painel/login')

  const store = await prisma.store.findUnique({
    where: { id: session.user.storeId },
    select: { status: true },
  })
  // Já ativou? vai pro onboarding.
  if (store?.status === 'ACTIVE' || store?.status === 'TRIALING') redirect('/painel/onboarding')

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900">
          Aguardando confirmação do pagamento
        </h1>
        <p className="mt-2 text-neutral-600">
          Assim que o pagamento for confirmado, sua loja é ativada automaticamente e você é levado
          para a configuração. Pode deixar esta página aberta.
        </p>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
        </p>
        <p className="mt-4 text-xs text-neutral-400">
          Pagou por PIX ou boleto? A confirmação pode levar alguns minutos. Você também receberá um
          e-mail quando a loja for ativada.
        </p>
        <AguardandoPoller />
      </div>
    </main>
  )
}
