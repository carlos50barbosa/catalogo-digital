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
  const dow = now.getDay()
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

  const cur = now.getHours() * 60 + now.getMinutes()
  // Suporta intervalos que cruzam a meia-noite (ex.: 18:00 - 02:00).
  const isOpen = close >= open ? cur >= open && cur < close : cur >= open || cur < close

  return {
    isOpen,
    todayLabel,
    todayHours: `${today.open} - ${today.close}`,
  }
}
