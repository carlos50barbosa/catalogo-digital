'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lineKey } from '@/lib/cart-key'
import type { CartLine, CartItem, CartItemOption, SerializedProduct } from '@/lib/types'

const COOKIE_PREFIX = 'cart_'
const MAX_QTY = 99

/** Arredonda para 3 casas (evita drift de float ao somar passos de 0,25 kg). */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

/** Opções que um item ganha por padrão ao ser adicionado (os "vem com"). */
function defaultOptionIds(p: SerializedProduct): string[] {
  return p.optionGroups.flatMap((g) =>
    g.options.filter((o) => o.defaultSelected && o.isAvailable).map((o) => o.id),
  )
}

/**
 * Normaliza uma entrada crua do cookie.
 *
 * COMPATIBILIDADE: cookies gravados antes dos complementos têm o formato antigo
 * (com name/price/unit/imageUrl e SEM optionIds). Eles continuam válidos — o que
 * importa é productId + quantity. Sem isso, todo cliente com carrinho aberto
 * quebraria no dia do deploy.
 *
 * Ausência de `optionIds` NÃO é o mesmo que lista vazia: lista vazia significa
 * que o cliente desmarcou tudo ("sem alface, sem cebola"), enquanto ausência é
 * um carrinho antigo que nunca teve escolha. Por isso o legado volta como null
 * e recebe os padrões do produto, e não uma lista vazia.
 */
function normalizeLine(raw: unknown): (Omit<CartLine, 'optionIds'> & {
  optionIds: string[] | null
}) | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.productId !== 'string' || !r.productId) return null
  const quantity = Number(r.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  const optionIds = Array.isArray(r.optionIds)
    ? r.optionIds.filter((x): x is string => typeof x === 'string')
    : null // formato antigo
  const notes = typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim() : undefined
  return { productId: r.productId, optionIds, notes, quantity }
}

/**
 * Carrinho da vitrine. Estado em React, persistido em COOKIE por loja
 * (cart_{slug}).
 *
 * O cookie guarda só REFERÊNCIAS (produto + opções + observação + quantidade).
 * Nome, preço e imagem são resolvidos contra os produtos da página a cada
 * render — cookie tem teto de ~4KB e o servidor reprecifica tudo no checkout,
 * então snapshot no cliente só ocuparia espaço e envelheceria.
 *
 * Consequência: uma linha cujo produto sumiu do catálogo é descartada em vez de
 * seguir até o checkout e falhar lá.
 */
export function useCart(slug: string, products: SerializedProduct[]) {
  const cookieName = COOKIE_PREFIX + slug
  const [lines, setLines] = useState<CartLine[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Ref para a hidratação enxergar o catálogo sem virar dependência do efeito
  // (que precisa rodar uma única vez).
  const productsRef = useRef(products)
  productsRef.current = products

  // Hidrata do cookie no primeiro render (cliente).
  useEffect(() => {
    const raw = readCookie(cookieName)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const catalogo = new Map(productsRef.current.map((p) => [p.id, p]))
          const out: CartLine[] = []
          for (const item of parsed) {
            const l = normalizeLine(item)
            if (!l) continue
            if (l.optionIds !== null) {
              out.push({ ...l, optionIds: l.optionIds })
              continue
            }
            // Linha do formato antigo: adota os "vem com" atuais do produto,
            // como se o cliente tivesse acabado de adicionar o item.
            const p = catalogo.get(l.productId)
            if (!p) continue
            out.push({ ...l, optionIds: defaultOptionIds(p) })
          }
          setLines(out)
        }
      } catch {
        // cookie corrompido: ignora
      }
    }
    setHydrated(true)
  }, [cookieName])

  // Persiste a cada mudança (após hidratar).
  useEffect(() => {
    if (!hydrated) return
    writeCookie(cookieName, JSON.stringify(lines))
  }, [lines, hydrated, cookieName])

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  /**
   * Resolve as linhas contra o catálogo: preço composto, nomes dos complementos
   * e quais "vem com" foram removidos. Linhas órfãs são descartadas.
   */
  const items = useMemo<CartItem[]>(() => {
    const out: CartItem[] = []
    for (const line of lines) {
      const p = byId.get(line.productId)
      if (!p) continue

      const selected = new Set(line.optionIds)
      const options: CartItemOption[] = []
      let delta = 0

      for (const g of p.optionGroups) {
        for (const o of g.options) {
          if (selected.has(o.id)) {
            delta += o.priceDelta
            // Só lista o que MUDOU em relação ao item padrão. Um "vem com"
            // mantido (alface, tomate) não vira linha: já é o lanche normal, e
            // listá-lo entulharia o carrinho e a mensagem do WhatsApp. Se a
            // opção padrão custa algo, aí sim aparece — o cliente precisa ver
            // de onde veio o valor.
            if (!o.defaultSelected || o.priceDelta !== 0) {
              options.push({ name: o.name, priceDelta: o.priceDelta, removed: false })
            }
          } else if (o.defaultSelected) {
            // Vinha marcada e não está mais → o cliente tirou.
            options.push({ name: o.name, priceDelta: 0, removed: true })
          }
        }
      }

      out.push({
        ...line,
        lineKey: lineKey(line.productId, line.optionIds, line.notes),
        name: p.name,
        unit: p.unit,
        imageUrl: p.imageUrl,
        basePrice: p.price,
        unitPrice: Math.round((p.price + delta) * 100) / 100,
        options,
      })
    }
    return out
  }, [lines, byId])

  const add = useCallback(
    (p: SerializedProduct, qty = 1, optionIds: string[] = [], notes?: string) => {
      const key = lineKey(p.id, optionIds, notes)
      setLines((prev) => {
        const found = prev.find(
          (l) => lineKey(l.productId, l.optionIds, l.notes) === key,
        )
        if (found) {
          return prev.map((l) =>
            lineKey(l.productId, l.optionIds, l.notes) === key
              ? { ...l, quantity: Math.min(MAX_QTY, round3(l.quantity + qty)) }
              : l,
          )
        }
        const clean = notes?.trim()
        return [
          ...prev,
          { productId: p.id, optionIds, notes: clean || undefined, quantity: qty },
        ]
      })
    },
    [],
  )

  const setQty = useCallback((key: string, qty: number) => {
    const next = round3(qty)
    setLines((prev) =>
      next <= 0
        ? prev.filter((l) => lineKey(l.productId, l.optionIds, l.notes) !== key)
        : prev.map((l) =>
            lineKey(l.productId, l.optionIds, l.notes) === key
              ? { ...l, quantity: Math.min(MAX_QTY, next) }
              : l,
          ),
    )
  }, [])

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => lineKey(l.productId, l.optionIds, l.notes) !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [items],
  )

  return { items, add, setQty, remove, clear, count, subtotal, hydrated }
}
