'use server'

import { revalidatePath } from 'next/cache'
import { requireStore } from '@/lib/auth-helpers'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/data/categories'
import { categorySchema, fieldErrors } from '@/lib/validation'

export async function createCategoryAction(name: string) {
  const { storeId } = await requireStore()
  const parsed = categorySchema.safeParse({ name })
  if (!parsed.success) return { ok: false as const, error: fieldErrors(parsed.error).name }

  const cat = await createCategory(storeId, parsed.data.name)
  revalidatePath('/painel/categorias')
  return {
    ok: true as const,
    category: { id: cat.id, name: cat.name, sortOrder: cat.sortOrder },
  }
}

export async function renameCategoryAction(id: string, name: string) {
  const { storeId } = await requireStore()
  const parsed = categorySchema.safeParse({ name })
  if (!parsed.success) return { ok: false as const, error: fieldErrors(parsed.error).name }

  const ok = await updateCategory(storeId, id, { name: parsed.data.name })
  revalidatePath('/painel/categorias')
  return { ok }
}

export async function deleteCategoryAction(id: string) {
  const { storeId } = await requireStore()
  const ok = await deleteCategory(storeId, id)
  revalidatePath('/painel/categorias')
  revalidatePath('/painel/produtos')
  return { ok }
}

export async function reorderCategoriesAction(orderedIds: string[]) {
  const { storeId } = await requireStore()
  await reorderCategories(storeId, orderedIds)
  revalidatePath('/painel/categorias')
  return { ok: true as const }
}
