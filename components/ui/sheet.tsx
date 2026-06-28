'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Drawer/bottom-sheet acessível.
 * Mobile: desliza de baixo (bottom sheet). Desktop (sm+): drawer à direita.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute flex flex-col bg-white shadow-sheet',
          // mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl',
          // desktop: right drawer
          'sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-full sm:w-[440px] sm:max-h-none sm:rounded-none',
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-neutral-200 p-4">{footer}</div>}
      </div>
    </div>
  )
}
