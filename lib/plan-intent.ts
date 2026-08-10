import { cookies } from 'next/headers'
import type { Plan } from '@prisma/client'
import { parsePlan } from '@/lib/plans'

/**
 * Plano que o lojista escolheu ANTES de ter conta (link /cadastro?plano=X vindo
 * da vitrine de preços da home). Guardado em cookie porque entre a escolha e a
 * tela de pagamento existe a verificação de e-mail — não dá para carregar a
 * intenção em query string por toda essa volta.
 *
 * É só intenção: o plano realmente cobrado é sempre o enviado no formulário de
 * /cadastro/plano e validado no choosePlanAction.
 *
 * Só use em Server Actions/Components — importa `next/headers`.
 */
const COOKIE = 'cd_plano'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export async function rememberPlanIntent(value: unknown): Promise<void> {
  const plan = parsePlan(value)
  if (!plan) return
  const store = await cookies()
  store.set(COOKIE, plan, {
    maxAge: MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export async function readPlanIntent(): Promise<Plan | null> {
  const store = await cookies()
  return parsePlan(store.get(COOKIE)?.value)
}

/** Chame ao assinar ou iniciar o teste — a intenção já cumpriu o papel. */
export async function clearPlanIntent(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE)
}
