'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  setProductAvailability,
  setProductPrice,
} from '@/lib/data/products'
import { getCatalogItem } from '@/lib/data/catalog'
import { productSchema, fieldErrors } from '@/lib/validation'
import { saveImage, hasUpload } from '@/lib/upload'
import { emptyToNull, type ActionState } from '@/lib/action-state'

function parseProductForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    description: emptyToNull(formData.get('description')),
    price: formData.get('price'),
    unit: String(formData.get('unit') ?? 'UN'),
    categoryId: emptyToNull(formData.get('categoryId')),
    catalogItemId: emptyToNull(formData.get('catalogItemId')),
    imageUrl: emptyToNull(formData.get('imageUrl')),
    isAvailable: formData.get('isAvailable') === 'on',
  }
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { storeId } = await requireStore()
  const parsed = productSchema.safeParse(parseProductForm(formData))
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  let imageUrl: string | null = parsed.data.imageUrl ?? null
  const file = formData.get('image')
  if (hasUpload(file)) {
    try {
      imageUrl = await saveImage(file, `stores/${storeId}/products`)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Falha no upload da imagem.' }
    }
  } else if (parsed.data.catalogItemId && !imageUrl) {
    // Produto vindo da biblioteca herda a imagem padrão.
    const ci = await getCatalogItem(parsed.data.catalogItemId)
    imageUrl = ci?.defaultImageUrl ?? null
  }

  await createProduct(storeId, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    unit: parsed.data.unit,
    categoryId: parsed.data.categoryId ?? null,
    catalogItemId: parsed.data.catalogItemId ?? null,
    imageUrl,
    isAvailable: parsed.data.isAvailable ?? true,
  })

  revalidatePath('/painel/produtos')
  revalidatePath('/painel')
  redirect('/painel/produtos')
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { storeId } = await requireStore()
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Produto inválido.' }

  const parsed = productSchema.safeParse(parseProductForm(formData))
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  // Mantém a imagem atual (campo oculto) a menos que uma nova seja enviada.
  let imageUrl: string | null = parsed.data.imageUrl ?? null
  const file = formData.get('image')
  if (hasUpload(file)) {
    try {
      imageUrl = await saveImage(file, `stores/${storeId}/products`)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Falha no upload da imagem.' }
    }
  }

  const ok = await updateProduct(storeId, id, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    unit: parsed.data.unit,
    categoryId: parsed.data.categoryId ?? null,
    catalogItemId: parsed.data.catalogItemId ?? null,
    imageUrl,
    isAvailable: parsed.data.isAvailable ?? true,
  })
  if (!ok) return { error: 'Produto não encontrado.' }

  revalidatePath('/painel/produtos')
  redirect('/painel/produtos')
}

// --- Ações rápidas (chamadas direto do cliente, com storeId da sessão) ---

export async function setAvailabilityAction(id: string, isAvailable: boolean) {
  const { storeId } = await requireStore()
  const ok = await setProductAvailability(storeId, id, isAvailable)
  revalidatePath('/painel/produtos')
  return { ok }
}

export async function updatePriceAction(id: string, price: number) {
  const { storeId } = await requireStore()
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'Preço inválido.' }
  }
  const ok = await setProductPrice(storeId, id, price)
  revalidatePath('/painel/produtos')
  return { ok }
}

export async function deleteProductAction(id: string) {
  const { storeId } = await requireStore()
  const ok = await deleteProduct(storeId, id)
  revalidatePath('/painel/produtos')
  revalidatePath('/painel')
  return { ok }
}
