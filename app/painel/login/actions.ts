'use server'

import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { signIn } from '@/auth'
import { loginSchema, fieldErrors } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
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

  // Rate limit contra brute-force/credential stuffing: por IP (mais folgado) e
  // por e-mail (mais estrito, impede varrer uma conta específica trocando de IP).
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
  const email = parsed.data.email.toLowerCase()
  if (!rateLimit(`login:ip:${ip}`, 10, 60_000) || !rateLimit(`login:email:${email}`, 5, 60_000)) {
    return { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }
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
