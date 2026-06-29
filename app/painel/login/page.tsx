import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { auth } from '@/auth'
import { LoginForm } from '@/components/admin/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Painel',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  // Já logado? vai direto pro painel.
  const session = await auth()
  if (session?.user?.storeId) redirect('/painel')

  const { reset } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Painel da loja</h1>
          <p className="mt-1 text-sm text-neutral-500">Entre para gerenciar seu catálogo.</p>
        </div>

        {reset === '1' && (
          <p className="mb-4 rounded-xl bg-green-50 px-3 py-2 text-center text-sm text-green-700">
            Senha redefinida! Entre com a nova senha.
          </p>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Ainda não tem uma loja?{' '}
          <Link href="/cadastro" className="font-medium text-accent underline">
            Cadastre a sua
          </Link>
        </p>
      </div>
    </main>
  )
}
