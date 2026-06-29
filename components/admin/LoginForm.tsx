'use client'

import { useActionState } from 'react'
import { AlertCircle } from 'lucide-react'
import { loginAction } from '@/app/painel/login/actions'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState)

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@loja.com" />
        <FieldError message={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <Button type="submit" loading={pending} className="w-full" size="lg">
        Entrar
      </Button>

      <p className="text-center text-sm">
        <a href="/painel/recuperar-senha" className="font-medium text-accent underline">
          Esqueci minha senha
        </a>
      </p>
    </form>
  )
}
