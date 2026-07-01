'use server'

import bcrypt from 'bcryptjs'
import { signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { requireStore } from '@/lib/auth-helpers'
import { deleteStore } from '@/lib/data/stores'
import { getSubscription } from '@/lib/data/billing'
import { gateway } from '@/lib/billing'
import { config } from '@/lib/config'
import type { ActionState } from '@/lib/action-state'

export async function logoutAction() {
  await signOut({ redirectTo: '/painel/login' })
}

/**
 * Exclusão da loja/conta pelo próprio dono (LGPD — porta de saída).
 * Exige a senha para confirmar, cancela a assinatura no gateway (para parar
 * cobranças), apaga TODOS os dados (cascata) + imagens, e encerra a sessão.
 */
export async function deleteMyStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { storeId, userId } = await requireStore()
  const password = String(formData.get('password') ?? '')
  if (!password) return { error: 'Digite sua senha para confirmar.' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'Senha incorreta.' }
  }

  // Best-effort: cancela a assinatura no gateway para não seguir cobrando.
  if (config.asaas.apiKey) {
    const sub = await getSubscription(storeId)
    if (sub?.gatewaySubscriptionId) {
      try {
        await gateway.cancelSubscription(sub.gatewaySubscriptionId)
      } catch {
        // segue com a exclusão local mesmo se o gateway falhar
      }
    }
  }

  await deleteStore(storeId)
  await signOut({ redirectTo: '/' }) // lança redirect (encerra a sessão)
  return {}
}
