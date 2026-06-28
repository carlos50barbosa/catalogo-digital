// Tipos "serializáveis" (plain objects) trafegados de Server Components para
// Client Components. Repetimos as uniões dos enums do Prisma como tipos puros
// para NÃO importar o runtime do @prisma/client em componentes de cliente.

export type Unit = 'UN' | 'KG' | 'L' | 'PCT'
export type Fulfillment = 'DELIVERY_AND_PICKUP' | 'DELIVERY_ONLY' | 'PICKUP_ONLY'
export type Plan = 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM'
export type Role = 'OWNER' | 'STAFF'

/** Horário de funcionamento: chaves '0'..'6' (0 = domingo, igual a Date.getDay()). */
export type OpeningHours = Record<string, { open: string; close: string } | null>

export type SerializedStore = {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  whatsappNumber: string
  accentColor: string | null
  isActive: boolean
  plan: Plan
}

export type SerializedSettings = {
  address: string | null
  deliveryFee: number
  minOrderValue: number
  pixKey: string | null
  fulfillment: Fulfillment
  deliveryZones: string[]
  openingHours: OpeningHours | null
  showOutOfStock: boolean
  orderMessageTemplate: string | null
}

export type SerializedCategory = {
  id: string
  name: string
  sortOrder: number
}

export type SerializedProduct = {
  id: string
  name: string
  description: string | null
  price: number
  unit: Unit
  imageUrl: string | null
  isAvailable: boolean
  categoryId: string | null
  sortOrder: number
}

export type SerializedCatalogItem = {
  id: string
  name: string
  defaultImageUrl: string | null
  brand: string | null
  suggestedCategory: string | null
}

/** Item do carrinho no cliente. */
export type CartItem = {
  productId: string
  name: string
  price: number
  unit: Unit
  imageUrl: string | null
  quantity: number
}
