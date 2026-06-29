'use client'

import { useActionState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { requestPasswordResetAction } from '@/app/painel/recuperar-senha/actions'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'

export function RecuperarSenhaForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialActionState)

  if (state.ok && state.message) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-3 text-sm text-green-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.message}
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="email">E-mail da conta</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Enviar link de recuperação
      </Button>
    </form>
  )
}
