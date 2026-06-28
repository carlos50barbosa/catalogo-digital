import type {
  Store,
  StoreSettings,
  Category,
  Product,
  CatalogItem,
} from '@prisma/client'
import { decimalToNumber } from '@/lib/format'
import type {
  SerializedStore,
  SerializedSettings,
  SerializedCategory,
  SerializedProduct,
  SerializedCatalogItem,
  OpeningHours,
} from '@/lib/types'

// Mapeadores na borda servidor->cliente: convertem Decimal/Json em primitivos
// serializáveis. Mantêm o contrato dos tipos em lib/types.ts.

export function serializeStore(s: Store): SerializedStore {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    logoUrl: s.logoUrl,
    whatsappNumber: s.whatsappNumber,
    accentColor: s.accentColor,
    isActive: s.isActive,
    plan: s.plan,
  }
}

export const DEFAULT_SETTINGS: SerializedSettings = {
  address: null,
  deliveryFee: 0,
  minOrderValue: 0,
  pixKey: null,
  fulfillment: 'DELIVERY_AND_PICKUP',
  deliveryZones: [],
  openingHours: null,
  showOutOfStock: true,
  orderMessageTemplate: null,
}

export function serializeSettings(s: StoreSettings | null): SerializedSettings {
  if (!s) return { ...DEFAULT_SETTINGS }
  return {
    address: s.address,
    deliveryFee: decimalToNumber(s.deliveryFee),
    minOrderValue: decimalToNumber(s.minOrderValue),
    pixKey: s.pixKey,
    fulfillment: s.fulfillment,
    deliveryZones: Array.isArray(s.deliveryZones)
      ? (s.deliveryZones as string[])
      : [],
    openingHours: (s.openingHours as OpeningHours | null) ?? null,
    showOutOfStock: s.showOutOfStock,
    orderMessageTemplate: s.orderMessageTemplate,
  }
}

export function serializeCategory(c: Category): SerializedCategory {
  return { id: c.id, name: c.name, sortOrder: c.sortOrder }
}

export function serializeProduct(p: Product): SerializedProduct {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: decimalToNumber(p.price),
    unit: p.unit,
    imageUrl: p.imageUrl,
    isAvailable: p.isAvailable,
    categoryId: p.categoryId,
    sortOrder: p.sortOrder,
  }
}

export function serializeCatalogItem(c: CatalogItem): SerializedCatalogItem {
  return {
    id: c.id,
    name: c.name,
    defaultImageUrl: c.defaultImageUrl,
    brand: c.brand,
    suggestedCategory: c.suggestedCategory,
  }
}
