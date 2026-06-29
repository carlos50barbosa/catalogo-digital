import Link from 'next/link'
import { redirect } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { verifyEmailToken } from '@/lib/data/signup'

export const dynamic = 'force-dynamic'

export default async function VerifyEmailTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const ok = token ? await verifyEmailToken(token) : false

  // Verificado: segue pro fluxo de escolha de plano.
  if (ok) redirect('/cadastro/plano')

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <XCircle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900">Link inválido ou expirado</h1>
        <p className="mt-2 text-neutral-600">
          O link de verificação não é mais válido. Entre na sua conta para receber um novo.
        </p>
        <Link
          href="/cadastro/verificar-email"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Reenviar verificação
        </Link>
      </div>
    </main>
  )
}
