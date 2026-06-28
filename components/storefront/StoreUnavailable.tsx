import { Clock } from 'lucide-react'

/** Mensagem neutra exibida quando a loja está suspensa. */
export function StoreUnavailable({ name }: { name: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <Clock className="h-12 w-12 text-neutral-400" />
      <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">{name}</h1>
      <p className="mt-2 text-neutral-600">
        Esta loja está temporariamente indisponível. Tente novamente mais tarde.
      </p>
    </main>
  )
}
