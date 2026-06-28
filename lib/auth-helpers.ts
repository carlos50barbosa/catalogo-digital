import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import type { Role } from '@/lib/types'

export type SessionStore = {
  userId: string
  storeId: string
  role: Role
  storeSlug: string
  name: string
  email: string
}

/** Retorna o usuário da sessão ou null. */
export async function getSessionUser() {
  const session = await auth()
  return session?.user ?? null
}

/**
 * Garante autenticação e devolve o contexto da loja DA SESSÃO.
 * Use SEMPRE isto em páginas do painel e em Server Actions — o storeId vem
 * daqui, NUNCA de body/query/param. É a barreira central de isolamento.
 */
export async function requireStore(): Promise<SessionStore> {
  const session = await auth()
  const user = session?.user
  if (!user?.storeId) {
    redirect('/painel/login')
  }
  return {
    userId: user.id,
    storeId: user.storeId,
    role: user.role,
    storeSlug: user.storeSlug,
    name: user.name ?? '',
    email: user.email ?? '',
  }
}
