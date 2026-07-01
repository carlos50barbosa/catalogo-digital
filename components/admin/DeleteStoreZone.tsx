'use client'

import { useState, useActionState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { deleteMyStoreAction } from '@/app/painel/_actions/account'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Zona de risco: exclusão definitiva da loja/conta pelo dono (LGPD). */
export function DeleteStoreZone({ storeName }: { storeName: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(deleteMyStoreAction, initialActionState)

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-red-700">
        <AlertTriangle className="h-5 w-5" /> Zona de risco
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Excluir a loja apaga <strong>definitivamente</strong> todos os dados — produtos, pedidos,
        clientes, caderneta de fiado e a sua conta. Não dá para desfazer.
      </p>

      {!open ? (
        <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
          Excluir minha loja
        </Button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <p className="text-sm text-neutral-700">
            Confirme com sua senha para excluir <strong>{storeName}</strong>.
          </p>
          <Input
            name="password"
            type="password"
            required
            placeholder="Sua senha"
            autoComplete="current-password"
          />
          {state.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={pending}>
              Excluir para sempre
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
