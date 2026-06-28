import type { Unit } from '@/lib/types'

export type ParsedProductRow = {
  line: number
  name: string
  category: string
  price: number
  unit: Unit
}

export type CsvError = { line: number; message: string }

export type CsvParseResult = {
  rows: ParsedProductRow[]
  errors: CsvError[]
}

/** Detecta o delimitador mais provável (, ou ;) pela primeira linha. */
function detectDelimiter(firstLine: string): ',' | ';' {
  return (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
    ? ';'
    : ','
}

/** Parser CSV simples com suporte a campos entre aspas. */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c === '\r') {
      // ignora
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const UNIT_MAP: Record<string, Unit> = {
  un: 'UN',
  unidade: 'UN',
  kg: 'KG',
  kilo: 'KG',
  quilo: 'KG',
  l: 'L',
  litro: 'L',
  pct: 'PCT',
  pacote: 'PCT',
}

function parsePrice(raw: string): number | null {
  // aceita "3,50", "3.50", "R$ 3,50"
  const cleaned = raw
    .replace(/r\$/i, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // remove separador de milhar
    .replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Lê um CSV de produtos. Colunas esperadas (com cabeçalho):
 * nome, categoria, preco, unidade. Retorna linhas válidas + relatório de erros.
 */
export function parseProductsCsv(text: string): CsvParseResult {
  const trimmed = text.replace(/^﻿/, '').trim() // remove BOM
  if (!trimmed) return { rows: [], errors: [{ line: 0, message: 'Arquivo vazio.' }] }

  const firstLine = trimmed.split('\n')[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const raw = parseRows(trimmed, delimiter).filter((r) => r.some((c) => c.trim() !== ''))

  if (raw.length === 0) return { rows: [], errors: [{ line: 0, message: 'Arquivo vazio.' }] }

  const header = raw[0].map(normalizeHeader)
  const idx = {
    nome: header.findIndex((h) => h === 'nome' || h === 'produto'),
    categoria: header.findIndex((h) => h === 'categoria'),
    preco: header.findIndex((h) => h === 'preco' || h === 'preço' || h === 'valor'),
    unidade: header.findIndex((h) => h === 'unidade' || h === 'un'),
  }

  const errors: CsvError[] = []
  if (idx.nome === -1) errors.push({ line: 1, message: 'Coluna "nome" não encontrada.' })
  if (idx.preco === -1) errors.push({ line: 1, message: 'Coluna "preco" não encontrada.' })
  if (errors.length) return { rows: [], errors }

  const rows: ParsedProductRow[] = []
  for (let r = 1; r < raw.length; r++) {
    const cells = raw[r]
    const line = r + 1
    const name = (cells[idx.nome] ?? '').trim()
    if (!name) {
      errors.push({ line, message: 'Nome vazio — linha ignorada.' })
      continue
    }
    const price = parsePrice(cells[idx.preco] ?? '')
    if (price === null) {
      errors.push({ line, message: `Preço inválido em "${name}".` })
      continue
    }
    const category = idx.categoria >= 0 ? (cells[idx.categoria] ?? '').trim() : ''
    const rawUnit =
      idx.unidade >= 0 ? normalizeHeader(cells[idx.unidade] ?? '') : ''
    const unit = UNIT_MAP[rawUnit] ?? 'UN'

    rows.push({ line, name, category, price, unit })
  }

  return { rows, errors }
}
