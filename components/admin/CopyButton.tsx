'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CopyButton({
  value,
  label = 'Copiar',
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [done, setDone] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50',
        className,
      )}
    >
      {done ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      {done ? 'Copiado!' : label}
    </button>
  )
}
