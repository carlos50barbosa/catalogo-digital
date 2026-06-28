'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { loginSchema, fieldErrors } from '@/lib/validation'
import type { ActionState } from '@/lib/action-state'

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) }
  }

  try {
    // Em sucesso, signIn lança um redirect para /painel (propagado abaixo).
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/painel',
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'E-mail ou senha inválidos.' }
    }
    // Redirect do Next: precisa ser repropagado.
    throw error
  }
}
