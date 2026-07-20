'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  setProductAvailability,
  setProductPrice,
} from '@/lib/data/products'
import { getStoreForPanel, countProducts } from '@/lib/data/stores'
import { canAddProduct, productLimit } from '@/lib/plans'
import { getCatalogItem } from '@/lib/data/catalog'
import { setProductOptionGroups } from '@/lib/data/option-groups'
import { productSchema, fieldErrors } from '@/lib/validation'
import { saveImage, hasUpload, deleteImage } from '@/lib/upload'
import { emptyToNull, type ActionState } from '@/lib/action-state'

/**
 * Grupos de complementos marcados no formulário.
 *
 * Produto vendido por peso não aceita complementos: o priceDelta de um adicional
 * é um valor fixo, mas o preço do item é multiplicado pelo peso — "bacon +R$ 4"
 * num item de 0,5 kg viraria R$ 2. Em vez de inventar uma regra de escala, o
 * servidor simplesmente ignora os grupos nesse caso (a UI também os esconde).
 */
function parseOptionGroupIds(formData: FormData, unit: string): string[] {
  if (unit === 'KG') return []
  return formData.getAll('optionGroupIds').map(String).filter(Boolean)
}

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

  // Feature gating: limite de produtos do plano (validado no servidor).
  const store = await getStoreForPanel(storeId)
  if (store) {
    const count = await countProducts(storeId)
    if (!canAddProduct(store.plan, count)) {
      return {
        error: `Seu plano permite até ${productLimit(store.plan)} produtos. Fale com a gente para liberar mais.`,
      }
    }
  }

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

  const created = await createProduct(storeId, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    unit: parsed.data.unit,
    categoryId: parsed.data.categoryId ?? null,
    catalogItemId: parsed.data.catalogItemId ?? null,
    imageUrl,
    isAvailable: parsed.data.isAvailable ?? true,
  })

  const groupIds = parseOptionGroupIds(formData, parsed.data.unit)
  if (groupIds.length) await setProductOptionGroups(storeId, created.id, groupIds)

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
  let oldImageUrl: string | null = null
  if (hasUpload(file)) {
    // Guarda a imagem atual para apagar após trocar (evita arquivo órfão).
    const current = await getProduct(storeId, id)
    oldImageUrl = current?.imageUrl ?? null
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

  // Sempre redefine (inclusive para lista vazia): desmarcar todos os grupos
  // precisa desligar os complementos, não deixar os antigos pendurados.
  await setProductOptionGroups(storeId, id, parseOptionGroupIds(formData, parsed.data.unit))

  // Remove o upload antigo trocado (só se for arquivo próprio da loja).
  if (oldImageUrl && oldImageUrl !== imageUrl) await deleteImage(oldImageUrl)

  revalidatePath('/painel/produtos')
  redirect('/painel/produtos')
}

// --- Ações rápidas (chamadas direto do cliente, com storeId da sessão) ---

export async function setAvailabilityAction(
  id: string,
  isAvailable: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { storeId } = await requireStore()
  const ok = await setProductAvailability(storeId, id, isAvailable)
  revalidatePath('/painel/produtos')
  return ok ? { ok } : { ok, error: 'Produto não encontrado.' }
}

export async function updatePriceAction(
  id: string,
  price: number,
): Promise<{ ok: boolean; error?: string }> {
  const { storeId } = await requireStore()
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'Preço inválido.' }
  }
  const ok = await setProductPrice(storeId, id, price)
  revalidatePath('/painel/produtos')
  return ok ? { ok } : { ok, error: 'Produto não encontrado.' }
}

export async function deleteProductAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { storeId } = await requireStore()
  const current = await getProduct(storeId, id) // imageUrl antes de excluir
  const ok = await deleteProduct(storeId, id)
  if (ok && current?.imageUrl) await deleteImage(current.imageUrl)
  revalidatePath('/painel/produtos')
  revalidatePath('/painel')
  return ok ? { ok } : { ok, error: 'Produto não encontrado.' }
}
