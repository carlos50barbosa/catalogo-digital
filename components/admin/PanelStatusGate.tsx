'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PanelAccess } from '@/lib/store-status'

/**
 * Aplica os efeitos do status da loja no painel:
 * - warn (PAST_DUE): mostra faixa de aviso.
 * - billing_only (SUSPENDED) / readonly (CANCELED): restringe à tela de assinatura.
 */
export function PanelStatusGate({ access }: { access: PanelAccess }) {
  const pathname = usePathname()
  const router = useRouter()
  const onAssinatura = pathname?.startsWith('/painel/assinatura') ?? false

  useEffect(() => {
    if ((access === 'billing_only' || access === 'readonly') && !onAssinatura) {
      router.replace('/painel/assinatura')
    }
  }, [access, onAssinatura, router])

  if (access === 'full') return null

  const msg =
    access === 'warn'
      ? 'Pagamento pendente — regularize para não suspender sua loja.'
      : access === 'billing_only'
        ? 'Sua loja está suspensa por falta de pagamento. Regularize para reativá-la.'
        : 'Sua loja está cancelada. Fale com a gente para reativá-la.'

  return (
    <div
      className={cn(
        'mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
        access === 'warn'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {msg}
      </span>
      {!onAssinatura && (
        <Link href="/painel/assinatura" className="shrink-0 font-semibold underline">
          Ver assinatura
        </Link>
      )}
    </div>
  )
}
