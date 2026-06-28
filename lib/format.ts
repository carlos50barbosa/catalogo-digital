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
