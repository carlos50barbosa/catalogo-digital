import type { OpeningHours } from '@/lib/types'

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

export type OpenStatus = {
  /** null quando a loja não configurou horários. */
  isOpen: boolean | null
  todayLabel: string
  /** Horário de hoje, se houver, no formato "08:00 - 18:00". */
  todayHours: string | null
}

/** Fuso de referência da operação (Brasil). O horário Aberto/Fechado é sempre
 *  calculado neste fuso, independente do fuso do processo (a VPS roda em UTC). */
const STORE_TZ = 'America/Sao_Paulo'

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** Dia-da-semana (0=Dom) e minutos-desde-meia-noite do instante `now` no fuso da loja. */
function partsInStoreTz(now: Date): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value
  const dow = WEEKDAY_INDEX[get('weekday') ?? 'Sun'] ?? 0
  let hour = Number(get('hour') ?? '0')
  if (hour === 24) hour = 0 // alguns ambientes retornam '24' para meia-noite
  const minutes = hour * 60 + (Number(get('minute') ?? '0') || 0)
  return { dow, minutes }
}

/** "HH:mm" -> minutos desde a meia-noite. Retorna null se inválido. */
function toMinutes(hhmm: string | undefined): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Calcula se a loja está aberta agora com base em openingHours.
 * Tolerante a dados ausentes/malformados (nesses casos retorna isOpen=null).
 */
export function getOpenStatus(
  openingHours: OpeningHours | null | undefined,
  now: Date = new Date(),
): OpenStatus {
  const { dow, minutes: cur } = partsInStoreTz(now)
  const todayLabel = WEEKDAY_LABELS[dow]

  if (!openingHours || typeof openingHours !== 'object') {
    return { isOpen: null, todayLabel, todayHours: null }
  }

  const today = openingHours[String(dow)]
  if (!today || !today.open || !today.close) {
    // Dia sem expediente configurado => fechado hoje.
    return { isOpen: false, todayLabel, todayHours: null }
  }

  const open = toMinutes(today.open)
  const close = toMinutes(today.close)
  if (open == null || close == null) {
    return { isOpen: null, todayLabel, todayHours: null }
  }

  // `cur` já vem em minutos no fuso da loja (partsInStoreTz).
  // Suporta intervalos que cruzam a meia-noite (ex.: 18:00 - 02:00).
  const isOpen = close >= open ? cur >= open && cur < close : cur >= open || cur < close

  return {
    isOpen,
    todayLabel,
    todayHours: `${today.open} - ${today.close}`,
  }
}
