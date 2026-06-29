import { XMLParser } from 'fast-xml-parser'
import type { Unit } from '@/lib/types'

/**
 * Parser da NF-e (layout oficial 4.00 da SEFAZ, namespace
 * `http://www.portalfiscal.inf.br/nfe`). É o XML que o lojista RECEBE do
 * fornecedor (por e-mail ou no portal) — não há integração com a SEFAZ nem
 * certificado digital. Apenas leitura do XML estruturado.
 *
 * Decisões de robustez:
 * - `parseTagValue: false` mantém TODO texto como string. Crucial para o GTIN
 *   (13/14 dígitos) e o CNPJ, que perderiam zeros à esquerda / precisão se
 *   fossem convertidos em number. Os valores numéricos (qtde, custo) viram
 *   number explicitamente via `toNumber`.
 * - `removeNSPrefix: true` trata namespaces com ou sem prefixo.
 */

export type NfeItem = {
  cProd: string // código do produto no fornecedor
  barcode: string | null // GTIN/EAN normalizado (null quando "SEM GTIN"/inválido)
  description: string // xProd original (cru)
  suggestedName: string // xProd com limpeza leve (title case, sem códigos soltos)
  ncm: string | null
  uCom: string // unidade comercial do fornecedor (UN, CX, FD, KG...)
  unit: Unit // palpite mapeado para o enum de venda da loja
  qCom: number // quantidade comercial
  vUnCom: number // valor unitário = CUSTO de compra
  vProd: number // valor total do item
}

export type NfeParsed = {
  accessKey: string // chave de acesso (44 dígitos)
  supplierName: string | null
  supplierCnpj: string | null
  items: NfeItem[]
}

export type NfeParseResult =
  | { ok: true; data: NfeParsed }
  | { ok: false; error: string }

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  ignoreDeclaration: true,
})

/** Converte texto da NF-e (separador decimal SEMPRE ".") em number. */
function toNumber(raw: unknown): number {
  if (raw == null) return 0
  const n = parseFloat(String(raw))
  return Number.isFinite(n) ? n : 0
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Texto de um nó que pode vir como string ou objeto (#text). */
function text(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'object') {
    const t = (node as Record<string, unknown>)['#text']
    return t == null ? '' : String(t).trim()
  }
  return String(node).trim()
}

/** Busca recursiva da primeira ocorrência de uma chave no objeto parseado. */
function deepFind(obj: unknown, key: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined
  const rec = obj as Record<string, unknown>
  if (key in rec) return rec[key]
  for (const v of Object.values(rec)) {
    if (v && typeof v === 'object') {
      const found = deepFind(v, key)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function findInfNFe(root: Record<string, unknown>): Record<string, unknown> | null {
  const proc = root.nfeProc as Record<string, unknown> | undefined
  const nfe = (proc?.NFe ?? root.NFe) as Record<string, unknown> | undefined
  let inf = nfe?.infNFe ?? deepFind(root, 'infNFe')
  if (Array.isArray(inf)) inf = inf[0]
  return inf && typeof inf === 'object' ? (inf as Record<string, unknown>) : null
}

function findAccessKey(root: Record<string, unknown>, infNFe: Record<string, unknown>): string {
  const fromId = String(infNFe['@_Id'] ?? '').replace(/\D/g, '')
  if (fromId.length === 44) return fromId
  const fromCh = String(deepFind(root, 'chNFe') ?? '').replace(/\D/g, '')
  return fromCh
}

/** Normaliza/valida o GTIN. "SEM GTIN", vazio ou comprimento inválido → null. */
export function normalizeGtin(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s || /sem\s*gtin/i.test(s)) return null
  const digits = s.replace(/\D/g, '')
  // GTIN-8 / GTIN-12 (UPC) / GTIN-13 (EAN) / GTIN-14
  if ([8, 12, 13, 14].includes(digits.length)) return digits
  return null
}

const UNIT_MAP: Record<string, Unit> = {
  UN: 'UN',
  UND: 'UN',
  UNID: 'UN',
  UNIDADE: 'UN',
  PC: 'UN',
  PCS: 'UN',
  PECA: 'UN',
  KG: 'KG',
  KGS: 'KG',
  KILO: 'KG',
  QUILO: 'KG',
  L: 'L',
  LT: 'L',
  LTR: 'L',
  LITRO: 'L',
  ML: 'L',
  PCT: 'PCT',
  PCTE: 'PCT',
  PAC: 'PCT',
  PACOTE: 'PCT',
  FARDO: 'PCT',
}

/** Mapeia a unidade comercial do fornecedor para o enum de venda (palpite). */
function mapUnit(uCom: string): Unit {
  const key = uCom.trim().toUpperCase().replace(/[^A-Z]/g, '')
  return UNIT_MAP[key] ?? 'UN'
}

/**
 * Limpeza leve da descrição (xProd) para virar nome inicial:
 * - title case nas palavras alfabéticas;
 * - mantém tokens com dígitos em MAIÚSCULA (medidas: 2L, 500ML, 5KG);
 * - remove códigos numéricos longos soltos (>= 6 dígitos).
 */
export function cleanProductName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ')
  if (!s) return ''
  const tokens = s.split(' ').filter((t) => !/^\d{6,}$/.test(t))
  const out = tokens
    .map((t) => {
      if (/\d/.test(t)) return t.toUpperCase()
      const lower = t.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
    .trim()
  return out || s
}

/**
 * Lê o XML de uma NF-e e extrai fornecedor, chave de acesso e itens.
 * Resiliente a XML malformado e a notas que não sejam NF-e.
 */
export function parseNfe(xml: string): NfeParseResult {
  const trimmed = (xml ?? '').replace(/^﻿/, '').trim()
  if (!trimmed) return { ok: false, error: 'Arquivo vazio.' }

  let root: Record<string, unknown>
  try {
    root = parser.parse(trimmed) as Record<string, unknown>
  } catch {
    return { ok: false, error: 'Não foi possível ler o XML. O arquivo parece estar corrompido.' }
  }

  const infNFe = findInfNFe(root)
  if (!infNFe) {
    return {
      ok: false,
      error: 'Este XML não parece ser uma NF-e (estrutura infNFe não encontrada).',
    }
  }

  const accessKey = findAccessKey(root, infNFe)
  if (accessKey.length !== 44) {
    return { ok: false, error: 'Chave de acesso da NF-e inválida ou ausente.' }
  }

  const emit = (infNFe.emit ?? {}) as Record<string, unknown>
  const supplierName = text(emit.xNome) || null
  const supplierCnpj = (text(emit.CNPJ) || text(emit.CPF)).replace(/\D/g, '') || null

  const detRaw = infNFe.det
  const dets = (Array.isArray(detRaw) ? detRaw : detRaw ? [detRaw] : []) as Record<
    string,
    unknown
  >[]

  const items: NfeItem[] = []
  for (const det of dets) {
    const prod = det?.prod as Record<string, unknown> | undefined
    if (!prod) continue
    const description = text(prod.xProd)
    const uCom = text(prod.uCom) || 'UN'
    items.push({
      cProd: text(prod.cProd),
      barcode: normalizeGtin(prod.cEAN),
      description,
      suggestedName: cleanProductName(description),
      ncm: text(prod.NCM) || null,
      uCom,
      unit: mapUnit(uCom),
      qCom: toNumber(prod.qCom),
      vUnCom: round2(toNumber(prod.vUnCom)),
      vProd: round2(toNumber(prod.vProd)),
    })
  }

  if (items.length === 0) {
    return { ok: false, error: 'Nenhum item encontrado na nota fiscal.' }
  }

  return { ok: true, data: { accessKey, supplierName, supplierCnpj, items } }
}
