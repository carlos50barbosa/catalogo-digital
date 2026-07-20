'use server'

import { revalidatePath } from 'next/cache'
import { requireStore } from '@/lib/auth-helpers'
import { updateStoreProfile, upsertStoreSettings, getStoreForPanel } from '@/lib/data/stores'
import { can } from '@/lib/plans'
import { settingsSchema, fieldErrors } from '@/lib/validation'
import { saveImage, hasUpload } from '@/lib/upload'
import { normalizeBrWhatsapp } from '@/lib/utils'
import { emptyToNull, type ActionState } from '@/lib/action-state'

function parseZones(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseOpeningHours(formData: FormData) {
  const oh: Record<string, { open: string; close: string } | null> = {}
  for (let d = 0; d < 7; d++) {
    const closed = formData.get(`oh_${d}_closed`) === 'on'
    const open = String(formData.get(`oh_${d}_open`) ?? '').trim()
    const close = String(formData.get(`oh_${d}_close`) ?? '').trim()
    oh[String(d)] = closed || !open || !close ? null : { open, close }
  }
  return oh
}

export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { storeId } = await requireStore()

  const obj = {
    name: String(formData.get('name') ?? '').trim(),
    // Sem fallback de propósito: numa EDIÇÃO, cair no default rebaixaria uma
    // lanchonete a mercadinho sem avisar. Campo ausente vira erro de validação.
    segment: String(formData.get('segment') ?? ''),
    whatsappNumber: normalizeBrWhatsapp(String(formData.get('whatsappNumber') ?? '')),
    accentColor: String(formData.get('accentColor') ?? '').trim(),
    address: emptyToNull(formData.get('address')),
    deliveryFee: formData.get('deliveryFee'),
    minOrderValue: formData.get('minOrderValue'),
    pixKey: emptyToNull(formData.get('pixKey')),
    fulfillment: String(formData.get('fulfillment') ?? 'DELIVERY_AND_PICKUP'),
    deliveryZones: parseZones(String(formData.get('deliveryZones') ?? '')),
    showOutOfStock: formData.get('showOutOfStock') === 'on',
    receiptWidth: formData.get('receiptWidth') ?? 80,
    orderMessageTemplate: emptyToNull(formData.get('orderMessageTemplate')),
    openingHours: parseOpeningHours(formData),
  }

  const parsed = settingsSchema.safeParse(obj)
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) }

  // Logo: mantém o atual (campo oculto) salvo se um novo for enviado.
  let logoUrl: string | null = emptyToNull(formData.get('logoUrl'))
  const logo = formData.get('logo')
  if (hasUpload(logo)) {
    try {
      logoUrl = await saveImage(logo, `stores/${storeId}/logo`)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Falha no upload do logo.' }
    }
  }

  const accent = parsed.data.accentColor ? parsed.data.accentColor : null

  // Branding: mensagem personalizada do pedido só em planos com branding "full".
  const store = await getStoreForPanel(storeId)
  const allowCustomMessage = store ? can(store.plan, 'customMessage') : false
  const orderMessageTemplate = allowCustomMessage ? (parsed.data.orderMessageTemplate ?? null) : null

  await updateStoreProfile(storeId, {
    name: parsed.data.name,
    segment: parsed.data.segment,
    whatsappNumber: parsed.data.whatsappNumber,
    accentColor: accent,
    logoUrl,
  })

  await upsertStoreSettings(storeId, {
    address: parsed.data.address ?? null,
    deliveryFee: parsed.data.deliveryFee,
    minOrderValue: parsed.data.minOrderValue,
    pixKey: parsed.data.pixKey ?? null,
    fulfillment: parsed.data.fulfillment,
    deliveryZones: parsed.data.deliveryZones,
    openingHours: parsed.data.openingHours ?? null,
    showOutOfStock: parsed.data.showOutOfStock ?? true,
    receiptWidth: parsed.data.receiptWidth,
    orderMessageTemplate,
  })

  revalidatePath('/painel/configuracoes')
  revalidatePath('/painel')
  return { ok: true, message: 'Configurações salvas com sucesso!' }
}
