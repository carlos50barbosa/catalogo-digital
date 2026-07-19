import type { StoreSegment } from '@/lib/types'

// Ramo da loja (mercadinho, lanchonete, ...). Ponto único de verdade dos textos
// e comportamentos que mudam por segmento — evita espalhar `if (segment === ...)`
// pelas telas. Ao adicionar um segmento novo, basta uma entrada aqui.

export type SegmentCopy = {
  value: StoreSegment
  /** Nome do ramo, como o dono o reconhece no cadastro. */
  label: string
  /** Frase curta de apoio no cadastro. */
  hint: string
  /** Rótulo da seção de itens à venda (menu do painel, títulos). */
  itemsLabel: string
  /** Singular, para frases ("adicionar {item}"). */
  itemLabel: string
  /** Plural — explícito porque em português não basta somar "s" (item → itens). */
  itemLabelPlural: string
  /** Descrição do atalho de itens no painel. */
  itemsDesc: string
  /** Tipo schema.org da vitrine pública (SEO local). */
  schemaType: string
}

export const SEGMENTS: Record<StoreSegment, SegmentCopy> = {
  MERCADO: {
    value: 'MERCADO',
    label: 'Mercadinho',
    hint: 'Mercearia, hortifruti, conveniência, distribuidora',
    itemsLabel: 'Produtos',
    itemLabel: 'produto',
    itemLabelPlural: 'produtos',
    itemsDesc: 'Cadastre e edite',
    schemaType: 'GroceryStore',
  },
  LANCHONETE: {
    value: 'LANCHONETE',
    label: 'Lanchonete',
    hint: 'Lanches, pizzaria, açaí, marmita — com adicionais no pedido',
    itemsLabel: 'Cardápio',
    itemLabel: 'item',
    itemLabelPlural: 'itens',
    itemsDesc: 'Monte seu cardápio',
    schemaType: 'Restaurant',
  },
}

export const SEGMENT_LIST: SegmentCopy[] = [SEGMENTS.MERCADO, SEGMENTS.LANCHONETE]

export const DEFAULT_SEGMENT: StoreSegment = 'MERCADO'

/** Copy do segmento, tolerante a valor ausente (lojas antigas, dados parciais). */
export function segmentCopy(segment: StoreSegment | null | undefined): SegmentCopy {
  return SEGMENTS[segment ?? DEFAULT_SEGMENT] ?? SEGMENTS[DEFAULT_SEGMENT]
}

/** Segmentos que trabalham com complementos/adicionais no item do pedido. */
export function hasOptions(segment: StoreSegment | null | undefined): boolean {
  return (segment ?? DEFAULT_SEGMENT) === 'LANCHONETE'
}
