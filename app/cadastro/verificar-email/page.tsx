import { redirect } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ResendButton } from '@/components/signup/ResendButton'

export const dynamic = 'force-dynamic'

export default async function VerificarEmailPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/painel/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { emailVerified: true },
  })
  // Já verificou? segue pro plano.
  if (user?.emailVerified) redirect('/cadastro/plano')

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900">Confirme seu e-mail</h1>
        <p className="mt-2 text-neutral-600">
          Enviamos um link de confirmação para <strong>{session.user.email}</strong>. Clique nele
          para escolher seu plano e ativar a loja.
        </p>
        <p className="mt-4 text-sm text-neutral-500">
          Não recebeu? Verifique o spam ou <ResendButton />.
        </p>
      </div>
    </main>
  )
}
