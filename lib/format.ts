import type { Prisma } from '@prisma/client'
import type { Unit } from '@/lib/types'

/**
 * Converte um Decimal do Prisma (ou number/string) em number serializável.
 * Usar SEMPRE na borda servidor->cliente, pois Decimal não é serializável.
 */
export function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value == null) return 0
  return typeof value === 'number' ? value : Number(value)
}

/** Formata um valor em Reais (pt-BR). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

/** Rótulos curtos das unidades de medida. */
export const UNIT_LABELS: Record<Unit, string> = {
  UN: 'un',
  KG: 'kg',
  L: 'L',
  PCT: 'pct',
}

/** Sufixo de preço por unidade (ex.: "/kg"). */
export function unitSuffix(unit: Unit): string {
  return unit === 'KG' || unit === 'L' ? `/${UNIT_LABELS[unit]}` : ''
}

/** True se o produto é vendido por peso/volume contínuo (quantidade decimal). */
export function isWeighed(unit: Unit): boolean {
  return unit === 'KG'
}

/** Formata quantidade (decimal pt-BR, sem zeros sobrando). */
export function formatQty(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n)
}

/** Quantidade com unidade: "0,5 kg" para peso, "2" para unidades. */
export function formatQtyWithUnit(qty: number, unit: Unit): string {
  return isWeighed(unit) ? `${formatQty(qty)} ${UNIT_LABELS[unit]}` : `${formatQty(qty)}`
}

/** Data/hora no formato pt-BR. */
export function formatDateTimeBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}
