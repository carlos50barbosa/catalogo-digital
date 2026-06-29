// Montagem CENTRALIZADA da mensagem de cobrança de fiado (wa.me).
// Função pura: usada na ficha do cliente e na lista de devedores. O envio é MANUAL —
// o dono aperta enviar, do próprio número. Nada de automação/agendamento no MVP.

import { formatBRL } from '@/lib/format'

export type ReminderInput = {
  customerName: string
  storeName: string
  balance: number
  /** template da loja (fiadoReminderTemplate); placeholders {nome} {loja} {saldo} */
  template?: string | null
}

/** Mensagem padrão — amigável, não agressiva. */
function defaultMessage(o: ReminderInput): string {
  return `Olá ${o.customerName}, aqui é do ${o.storeName}. Seu saldo em aberto é de ${formatBRL(
    o.balance,
  )}. Quando puder acertar, é só chamar. Obrigado!`
}

/** Template customizado da loja: substitui {nome} {loja} {saldo}. */
function fromTemplate(tpl: string, o: ReminderInput): string {
  const map: Record<string, string> = {
    nome: o.customerName,
    loja: o.storeName,
    saldo: formatBRL(o.balance),
  }
  return tpl.replace(/\{(\w+)\}/g, (_, key: string) => (key in map ? map[key] : `{${key}}`))
}

export function buildFiadoReminderMessage(input: ReminderInput): string {
  const tpl = input.template?.trim()
  return tpl ? fromTemplate(tpl, input) : defaultMessage(input)
}

/** URL wa.me para o TELEFONE DO CLIENTE (cobrança parte do número do dono ao enviar). */
export function buildFiadoReminderUrl(customerPhone: string, message: string): string {
  const digits = (customerPhone || '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
