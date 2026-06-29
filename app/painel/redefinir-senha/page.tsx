import type { Metadata } from 'next'
import Link from 'next/link'
import { KeyRound, XCircle } from 'lucide-react'
import { isValidResetToken } from '@/lib/data/password-reset'
import { RedefinirSenhaForm } from '@/components/admin/RedefinirSenhaForm'

export const metadata: Metadata = {
  title: 'Redefinir senha',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const valid = token ? await isValidResetToken(token) : false

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        {valid ? (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-neutral-900">Criar nova senha</h1>
              <p className="mt-1 text-sm text-neutral-500">Escolha uma senha nova para sua conta.</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
              <RedefinirSenhaForm token={token as string} />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-card">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-neutral-900">Link inválido ou expirado</h1>
            <p className="mt-2 text-neutral-600">
              O link de redefinição não é mais válido. Solicite um novo.
            </p>
            <Link
              href="/painel/recuperar-senha"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Solicitar novo link
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
