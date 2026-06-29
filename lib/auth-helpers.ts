import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
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

/**
 * Como requireStore, mas FORÇA o onboarding: se a loja está ativa (ACTIVE/TRIALING)
 * porém ainda NÃO publicada, redireciona para /painel/onboarding. Usar nas páginas
 * "operacionais" do painel (dashboard, pedidos, clientes, fiado, divulgação) para
 * travar o acesso até a loja ir ao ar. As páginas de SETUP (onboarding, configurações,
 * produtos, categorias, importar, assinatura) seguem com requireStore — senão o próprio
 * onboarding (que leva a essas telas) não poderia ser concluído.
 */
export async function requireOnboardedStore(): Promise<SessionStore> {
  const session = await requireStore()
  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
    select: { status: true, published: true },
  })
  if (store && !store.published && (store.status === 'ACTIVE' || store.status === 'TRIALING')) {
    redirect('/painel/onboarding')
  }
  return session
}

/**
 * Garante que o usuário é SUPERADMIN (painel da plataforma).
 * OWNER/STAFF são redirecionados — nunca acessam dados de todas as lojas.
 */
export async function requireSuperadmin() {
  const session = await auth()
  const user = session?.user
  if (!user) redirect('/painel/login')
  if (user.role !== 'SUPERADMIN') redirect('/painel')
  return { userId: user.id, name: user.name ?? '', email: user.email ?? '' }
}
