import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <SearchX className="h-12 w-12 text-neutral-400" />
      <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">
        Página não encontrada
      </h1>
      <p className="mt-2 text-neutral-600">
        O endereço que você tentou acessar não existe ou a loja não está disponível.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Voltar ao início
      </Link>
    </main>
  )
}
