'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  fieldErrors,
} from '@/lib/validation'
import { createPasswordReset, resetPassword } from '@/lib/data/password-reset'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import type { ActionState } from '@/lib/action-state'

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const h = await headers()
  const ip =
    (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
  if (!rateLimit(`pwreset:${ip}`, 5, 60_000)) {
    return { error: 'Muitas tentativas. Aguarde um instante.' }
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
  })
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  const token = await createPasswordReset(parsed.data.email)
  if (token) {
    try {
      await sendPasswordResetEmail(
        parsed.data.email,
        `${config.appUrl}/painel/redefinir-senha?token=${token}`,
      )
    } catch {
      // não revela falha de envio
    }
  }

  // Mensagem genérica — evita enumeração de e-mails.
  return {
    ok: true,
    message: 'Se este e-mail estiver cadastrado, enviamos as instruções para redefinir a senha.',
  }
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get('token') ?? '')
  const parsed = passwordResetSchema.safeParse({ password: String(formData.get('password') ?? '') })
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  const ok = await resetPassword(token, parsed.data.password)
  if (!ok) return { error: 'Link inválido ou expirado. Solicite um novo.' }

  redirect('/painel/login?reset=1')
}
