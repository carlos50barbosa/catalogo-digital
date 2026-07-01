'use client'

import { useEffect, useState } from 'react'
import { Check, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Toast minimalista, sem dependência externa. API estilo `toast.success('...')`
// chamável de qualquer client component; o <Toaster/> (montado no layout raiz)
// escuta os eventos. Emissões antes do mount são ignoradas (toasts nascem de
// ações do usuário, já com a UI montada).

type ToastKind = 'success' | 'error'
type ToastItem = { id: number; kind: ToastKind; message: string }

let counter = 0
const listeners = new Set<(t: ToastItem) => void>()

function emit(kind: ToastKind, message: string) {
  const item: ToastItem = { id: ++counter, kind, message }
  listeners.forEach((l) => l(item))
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev, t])
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4000)
    }
    listeners.add(onToast)
    return () => {
      listeners.delete(onToast)
    }
  }, [])

  const dismiss = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id))

  if (items.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2"
      role="region"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-card',
            t.kind === 'success' ? 'bg-neutral-900' : 'bg-red-600',
          )}
        >
          {t.kind === 'success' ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Fechar"
            className="opacity-70 transition hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
