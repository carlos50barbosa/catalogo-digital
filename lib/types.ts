// Tipos "serializáveis" (plain objects) trafegados de Server Components para
// Client Components. Repetimos as uniões dos enums do Prisma como tipos puros
// para NÃO importar o runtime do @prisma/client em componentes de cliente.

export type Unit = 'UN' | 'KG' | 'L' | 'PCT'
export type Fulfillment = 'DELIVERY_AND_PICKUP' | 'DELIVERY_ONLY' | 'PICKUP_ONLY'
export type Plan = 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM'
export type StoreSegment = 'MERCADO' | 'LANCHONETE'
export type Role = 'OWNER' | 'STAFF' | 'SUPERADMIN'

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
  segment: StoreSegment
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

export type SerializedOption = {
  id: string
  name: string
  priceDelta: number
  /** Já vem marcada: desmarcar significa TIRAR o ingrediente. */
  defaultSelected: boolean
  isAvailable: boolean
}

export type SerializedOptionGroup = {
  id: string
  name: string
  /** minSelect >= 1 torna o grupo obrigatório. */
  minSelect: number
  /** maxSelect 1 = escolha única (radio); > 1 = múltipla (checkbox). */
  maxSelect: number
  options: SerializedOption[]
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
  optionGroups: SerializedOptionGroup[]
}

export type SerializedCatalogItem = {
  id: string
  name: string
  defaultImageUrl: string | null
  brand: string | null
  suggestedCategory: string | null
}

/** Item do carrinho no cliente. */
/**
 * O que é PERSISTIDO no cookie do carrinho — só referências, sem snapshot de
 * nome/preço/imagem. Cookie tem teto de ~4KB e uma lanchonete acumula muitos
 * complementos por linha; além disso o servidor reprecifica tudo no checkout,
 * então snapshot no cliente nunca foi autoridade.
 */
export type CartLine = {
  productId: string
  optionIds: string[]
  notes?: string
  quantity: number
}

/** Complemento já resolvido para exibição. */
export type CartItemOption = {
  name: string
  priceDelta: number
  /** Vinha marcado por padrão e o cliente desmarcou → "sem cebola". */
  removed: boolean
}

/**
 * Linha do carrinho resolvida contra os produtos da página (o que a UI usa).
 * Produzida por useCart; nunca vai para o cookie.
 */
export type CartItem = CartLine & {
  lineKey: string
  name: string
  unit: Unit
  imageUrl: string | null
  /** Preço do produto sem complementos. */
  basePrice: number
  /** basePrice + soma dos priceDelta — é o que multiplica pela quantidade. */
  unitPrice: number
  options: CartItemOption[]
}

// ---------- Importação por NF-e (XML) ----------

/** Destino do item da nota após o match por GTIN. */
export type NfeMatchStatus =
  | 'UPDATE' // já existe na loja (mesmo barcode) → atualizar custo
  | 'LIBRARY' // achado na biblioteca compartilhada → entra completo (nome + foto)
  | 'NEW' // sem GTIN ou sem correspondência → produto novo a revisar

/** Linha da tela de revisão (servidor -> cliente). Nada é gravado até confirmar. */
export type NfeReviewItem = {
  key: string // id estável para o React (índice do item na nota)
  status: NfeMatchStatus
  name: string // nome sugerido (do match ou da limpeza do xProd)
  barcode: string | null
  cost: number | null // custo do XML (vUnCom)
  price: number | null // preço de venda atual (existente) ou null (novo)
  unit: Unit // palpite mapeado do uCom
  category: string | null // categoria sugerida (da biblioteca) ou null
  imageUrl: string | null // foto da biblioteca, se houver
  qCom: number // quantidade da nota (apenas informativo na revisão)
  uCom: string // unidade comercial do fornecedor (informativo)
  productId: string | null // referência ao produto da loja (status UPDATE)
  catalogItemId: string | null // referência à biblioteca (status LIBRARY)
}

/** Resultado da análise da NF-e devolvido à tela de revisão. */
export type NfeAnalyzeResult =
  | {
      ok: true
      accessKey: string
      supplierName: string | null
      supplierCnpj: string | null
      alreadyImportedAt: string | null // DD/MM/AAAA se a nota já foi importada
      items: NfeReviewItem[]
      plan: { maxProducts: number | null; currentCount: number }
    }
  | { ok: false; error: string }

// ---------- Fiado (caderneta digital) ----------

export type FiadoAccountStatus = 'ACTIVE' | 'BLOCKED'
export type FiadoEntryType = 'DEBIT' | 'CREDIT'

/** Lançamento do extrato (imutável), já serializado para o cliente. */
export type SerializedFiadoEntry = {
  id: string
  type: FiadoEntryType
  amount: number
  description: string | null
  orderId: string | null
  dueDate: string | null // ISO
  reversesEntryId: string | null
  isReversal: boolean // este lançamento é um estorno
  reversed: boolean // este lançamento foi estornado por outro
  createdByName: string | null // nome de quem lançou (auditoria)
  createdAt: string // ISO
}

/** Conta de fiado serializada. */
export type SerializedFiadoAccount = {
  id: string
  customerId: string
  balance: number // positivo = cliente deve
  creditLimit: number // 0 = sem limite
  status: FiadoAccountStatus
}

/** Linha da lista de devedores. */
export type FiadoDebtor = {
  accountId: string
  customerId: string
  customerName: string
  customerPhone: string
  balance: number
  status: FiadoAccountStatus
  daysOverdue: number // 0 se não está em atraso
  isOverdue: boolean
}

/** Indicadores da visão geral de fiado. */
export type FiadoOverview = {
  totalReceivable: number // soma dos saldos positivos
  debtorCount: number
  totalOverdue: number // soma dos saldos em atraso
  overdueCount: number
}
