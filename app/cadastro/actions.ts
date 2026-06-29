'use server'

import { headers } from 'next/headers'
import { AuthError } from 'next-auth'
import { auth, signIn } from '@/auth'
import { signupSchema, fieldErrors } from '@/lib/validation'
import {
  createSelfServiceStore,
  generateUniqueSlug,
  slugAvailable,
  emailTaken,
  regenerateVerifyToken,
} from '@/lib/data/signup'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import { slugify } from '@/lib/utils'
import type { ActionState } from '@/lib/action-state'

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const h = await headers()
  const ip =
    (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
  if (!rateLimit(`signup:${ip}`, 5, 60_000)) {
    return { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }
  }

  const obj = {
    ownerName: String(formData.get('ownerName') ?? '').trim(),
    storeName: String(formData.get('storeName') ?? '').trim(),
    whatsapp: String(formData.get('whatsapp') ?? '').replace(/\D/g, ''),
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    slug: String(formData.get('slug') ?? '').trim() || undefined,
  }
  const parsed = signupSchema.safeParse(obj)
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  // E-mail único — mensagem neutra (evita enumeração).
  if (await emailTaken(parsed.data.email)) {
    return { fieldErrors: { email: 'Não foi possível cadastrar com este e-mail. Tente fazer login.' } }
  }

  // Slug único.
  let slug: string
  const wanted = parsed.data.slug ? slugify(parsed.data.slug) : ''
  if (wanted) {
    slug = (await slugAvailable(wanted)) ? wanted : await generateUniqueSlug(wanted)
  } else {
    slug = await generateUniqueSlug(parsed.data.storeName)
  }

  const { token } = await createSelfServiceStore({
    ownerName: parsed.data.ownerName,
    storeName: parsed.data.storeName,
    whatsapp: parsed.data.whatsapp,
    email: parsed.data.email,
    password: parsed.data.password,
    slug,
  })

  // E-mail de verificação (em dev sem SMTP, o link é logado no console).
  try {
    await sendVerificationEmail(
      parsed.data.email,
      `${config.appUrl}/verificar-email?token=${token}`,
    )
  } catch {
    // não bloqueia o cadastro
  }

  // Loga e leva à tela de verificação.
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/cadastro/verificar-email',
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Cadastro criado, mas não foi possível entrar. Faça login.' }
    }
    throw error // redirect do Next
  }
}

/** Reenvia o e-mail de verificação para o usuário logado. */
export async function resendVerificationAction(): Promise<void> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return
  const token = await regenerateVerifyToken(email)
  if (token) {
    try {
      await sendVerificationEmail(email, `${config.appUrl}/verificar-email?token=${token}`)
    } catch {
      // ignora
    }
  }
}
