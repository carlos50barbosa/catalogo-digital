'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import { reverseEntryAction } from '@/app/painel/_actions/fiado'

/**
 * Estorno de um lançamento. NÃO edita nem apaga o original — cria um lançamento
 * oposto que o referencia (livro-razão imutável).
 */
export function ReverseEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run() {
    if (!window.confirm('Estornar este lançamento? Será criado um lançamento de correção.')) return
    setError(null)
    startTransition(async () => {
      const res = await reverseEntryAction(entryId)
      if (res.ok) router.refresh()
      else if (!('needsConfirm' in res)) setError(res.error)
    })
  }

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title={error ?? 'Estornar lançamento'}
        aria-label="Estornar lançamento"
        className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50"
      >
        <Undo2 className="h-3.5 w-3.5" /> Estornar
      </button>
      {error && <span className="ml-1 text-xs text-red-600">{error}</span>}
    </span>
  )
}
