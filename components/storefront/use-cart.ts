'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CartItem, SerializedProduct } from '@/lib/types'

const COOKIE_PREFIX = 'cart_'
const MAX_QTY = 99

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

/**
 * Carrinho da vitrine. Estado em React, persistido em COOKIE por loja
 * (cart_{slug}) para sobreviver à navegação — sem depender de localStorage.
 */
export function useCart(slug: string) {
  const cookieName = COOKIE_PREFIX + slug
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hidrata do cookie no primeiro render (cliente).
  useEffect(() => {
    const raw = readCookie(cookieName)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
      } catch {
        // cookie corrompido: ignora
      }
    }
    setHydrated(true)
  }, [cookieName])

  // Persiste a cada mudança (após hidratar).
  useEffect(() => {
    if (!hydrated) return
    writeCookie(cookieName, JSON.stringify(items))
  }, [items, hydrated, cookieName])

  const add = useCallback((p: SerializedProduct, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === p.id)
      if (found) {
        return prev.map((i) =>
          i.productId === p.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + qty) }
            : i,
        )
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          imageUrl: p.imageUrl,
          quantity: qty,
        },
      ]
    })
  }, [])

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(MAX_QTY, qty) } : i,
          ),
    )
  }, [])

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  )

  return { items, add, setQty, remove, clear, count, subtotal, hydrated }
}
