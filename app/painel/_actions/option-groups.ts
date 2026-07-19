'use server'

import { revalidatePath } from 'next/cache'
import { requireStore } from '@/lib/auth-helpers'
import {
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  createOption,
  updateOption,
  deleteOption,
  setProductOptionGroups,
} from '@/lib/data/option-groups'
import { optionGroupSchema, optionSchema, fieldErrors } from '@/lib/validation'

// Actions de complementos. Sem gating por plano: complementos são recurso base
// em todos os planos. Sem gating por segmento também — quem esconde a tela do
// mercadinho é a navegação; a regra de dados vale para qualquer ramo.

const NOT_FOUND = 'Grupo não encontrado.'

function revalidate() {
  revalidatePath('/painel/complementos')
  revalidatePath('/painel/produtos')
}

type GroupInput = { name: string; minSelect: number; maxSelect: number }
type OptionInput = { name: string; priceDelta: number; defaultSelected: boolean }

function firstError(e: Parameters<typeof fieldErrors>[0]): string {
  return Object.values(fieldErrors(e))[0] ?? 'Dados inválidos.'
}

export async function createGroupAction(input: GroupInput) {
  const { storeId } = await requireStore()
  const parsed = optionGroupSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) }

  const g = await createOptionGroup(storeId, parsed.data)
  revalidate()
  return {
    ok: true as const,
    group: {
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: [],
      productCount: 0,
    },
  }
}

export async function updateGroupAction(id: string, input: GroupInput) {
  const { storeId } = await requireStore()
  const parsed = optionGroupSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) }

  const ok = await updateOptionGroup(storeId, id, parsed.data)
  revalidate()
  return ok ? { ok: true as const } : { ok: false as const, error: NOT_FOUND }
}

export async function deleteGroupAction(id: string) {
  const { storeId } = await requireStore()
  const ok = await deleteOptionGroup(storeId, id)
  revalidate()
  return ok ? { ok: true as const } : { ok: false as const, error: NOT_FOUND }
}

export async function createOptionAction(groupId: string, input: OptionInput) {
  const { storeId } = await requireStore()
  const parsed = optionSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) }

  const created = await createOption(storeId, groupId, parsed.data)
  if (!created) return { ok: false as const, error: NOT_FOUND }
  revalidate()
  return {
    ok: true as const,
    option: {
      id: created.id,
      name: created.name,
      priceDelta: Number(created.priceDelta),
      defaultSelected: created.defaultSelected,
      isAvailable: created.isAvailable,
    },
  }
}

export async function updateOptionAction(id: string, input: OptionInput) {
  const { storeId } = await requireStore()
  const parsed = optionSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: firstError(parsed.error) }

  const ok = await updateOption(storeId, id, parsed.data)
  revalidate()
  return ok ? { ok: true as const } : { ok: false as const, error: 'Opção não encontrada.' }
}

/** Esgotar/reativar uma opção sem abrir o formulário (ex.: acabou o bacon). */
export async function setOptionAvailabilityAction(id: string, isAvailable: boolean) {
  const { storeId } = await requireStore()
  const ok = await updateOption(storeId, id, { isAvailable })
  revalidate()
  return { ok }
}

export async function deleteOptionAction(id: string) {
  const { storeId } = await requireStore()
  const ok = await deleteOption(storeId, id)
  revalidate()
  return { ok }
}

/** Redefine os grupos usados por um produto (tela de edição do produto). */
export async function setProductGroupsAction(productId: string, groupIds: string[]) {
  const { storeId } = await requireStore()
  const ok = await setProductOptionGroups(storeId, productId, groupIds)
  revalidate()
  return ok ? { ok: true as const } : { ok: false as const, error: 'Produto não encontrado.' }
}
