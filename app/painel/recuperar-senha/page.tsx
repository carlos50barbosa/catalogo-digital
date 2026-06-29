import type { Metadata } from 'next'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { RecuperarSenhaForm } from '@/components/admin/RecuperarSenhaForm'

export const metadata: Metadata = {
  title: 'Recuperar senha',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Recuperar senha</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <RecuperarSenhaForm />
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/painel/login" className="font-medium text-accent underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  )
}
