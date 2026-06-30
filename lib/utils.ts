import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina classes Tailwind resolvendo conflitos (ex.: px-2 + px-4 => px-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * URL para renderizar uma imagem enviada. Os arquivos são gravados em UPLOAD_DIR e
 * a rota /api/uploads (servida pelo PRÓPRIO app) os entrega de forma consistente.
 * Em produção o Nginx pode ter um `location /uploads/` com `alias` divergente do
 * UPLOAD_DIR (→ 404); por isso apontamos para /api/uploads, que não depende dessa
 * config. Mantemos /uploads no banco; a conversão é só na renderização.
 */
export function uploadSrc(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('/uploads/') ? '/api' + url : url
}

/** Normaliza uma cor hex; devolve fallback se inválida. */
export function safeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const v = value.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback
}

/** Gera um slug a partir de um texto (acentos removidos, kebab-case). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Normaliza um WhatsApp brasileiro para o formato internacional (55 + DDD + número),
 * que é o que o `wa.me` exige. O lojista digita só o DDD + número; o 55 entra aqui.
 * Robusto: se vier com o 55 (por hábito), não duplica.
 */
export function normalizeBrWhatsapp(raw: string | null | undefined): string {
  const d = (raw ?? '').replace(/\D/g, '')
  if (!d) return ''
  // Já tem o DDI 55 (12 = fixo, 13 = celular).
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d
  // Só DDD + número (10 = fixo, 11 = celular) → adiciona o 55.
  if (d.length === 10 || d.length === 11) return '55' + d
  // Outros tamanhos: devolve só os dígitos (a validação decide se é válido).
  return d
}

/** Inverso do anterior, para EXIBIR no formulário: remove o 55 do início (DDD + número). */
export function stripBrDdi(num: string | null | undefined): string {
  const d = (num ?? '').replace(/\D/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d.slice(2)
  return d
}
