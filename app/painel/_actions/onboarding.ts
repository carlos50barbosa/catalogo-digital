'use server'

import { revalidatePath } from 'next/cache'
import { requireStore } from '@/lib/auth-helpers'
import { countProducts } from '@/lib/data/stores'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'

/** Publica a loja (go-live), exigindo um mínimo de produtos. */
export async function publishStoreAction() {
  const { storeId } = await requireStore()
  const count = await countProducts(storeId)
  const min = config.signup.minProductsToPublish
  if (count < min) {
    return { ok: false as const, error: `Adicione pelo menos ${min} produtos antes de publicar.` }
  }
  await prisma.store.update({ where: { id: storeId }, data: { published: true } })
  revalidatePath('/painel')
  revalidatePath('/painel/onboarding')
  return { ok: true as const }
}
