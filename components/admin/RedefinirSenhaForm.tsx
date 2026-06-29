'use client'

import { useActionState } from 'react'
import { AlertCircle } from 'lucide-react'
import { resetPasswordAction } from '@/app/painel/recuperar-senha/actions'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'

export function RedefinirSenhaForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialActionState)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="mínimo 6 caracteres"
        />
        <FieldError message={state.fieldErrors?.password} />
      </div>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Salvar nova senha
      </Button>
    </form>
  )
}
