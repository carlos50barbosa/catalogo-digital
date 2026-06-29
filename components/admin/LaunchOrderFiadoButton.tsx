'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotebookPen, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { launchFromOrderAction } from '@/app/painel/_actions/fiado'

/**
 * Botão "Lançar na conta (fiado)" no detalhe do pedido. Cria um DEBIT com o total
 * do pedido, vinculado ao cliente e ao orderId. Só aparece quando o fiado está
 * disponível e o pedido tem cliente.
 */
export function LaunchOrderFiadoButton({
  orderId,
  customerId,
  alreadyLaunched,
}: {
  orderId: string
  customerId: string | null
  alreadyLaunched: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!customerId) {
    return (
      <p className="flex items-center gap-2 text-sm text-neutral-500">
        <AlertTriangle className="h-4 w-4 text-neutral-400" />
        Pedido sem cliente vinculado — não dá para lançar no fiado.
      </p>
    )
  }

  if (alreadyLaunched || done) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Lançado na conta de fiado
        </span>
        <Link
          href={`/painel/fiado/${customerId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Ver ficha <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  function run() {
    setError(null)
    startTransition(async () => {
      const res = await launchFromOrderAction(orderId)
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else if (!('needsConfirm' in res)) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={run} loading={pending}>
        <NotebookPen className="h-4 w-4" /> Lançar na conta (fiado)
      </Button>
      {error && (
        <p className="flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
