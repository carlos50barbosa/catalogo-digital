'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, CreditCard, MessageCircle, LogOut, AlertCircle } from 'lucide-react'
import { checkActivationAction, reopenCheckoutAction } from '@/app/cadastro/plano/actions'
import { logoutAction } from '@/app/painel/_actions/account'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'

const POLL_MS = 5000
const SLOW_AFTER_TICKS = 30 // 30 × 5s = ~2,5 min sem confirmação => mostra aviso

/**
 * Interatividade da tela de espera: faz polling do status (ativa → onboarding),
 * permite reabrir o pagamento, checar manualmente, falar com o suporte ou sair.
 */
export function AguardandoActions({ waHref, canReopen }: { waHref: string; canReopen: boolean }) {
  const router = useRouter()
  const ticks = useRef(0)
  const [slow, setSlow] = useState(false)
  const [stillPending, setStillPending] = useState(false)
  const [checking, startCheck] = useTransition()
  const [payState, payAction, paying] = useActionState(reopenCheckoutAction, initialActionState)

  // Polling automático: quando a loja ativa (webhook confirmou), vai pro onboarding.
  useEffect(() => {
    let active = true
    const id = setInterval(async () => {
      ticks.current += 1
      const res = await checkActivationAction()
      if (!active) return
      if (res.status === 'ACTIVE' || res.status === 'TRIALING') {
        clearInterval(id)
        router.replace('/painel/onboarding')
      } else if (ticks.current >= SLOW_AFTER_TICKS) {
        setSlow(true)
      }
    }, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [router])

  function verifyNow() {
    setStillPending(false)
    startCheck(async () => {
      const res = await checkActivationAction()
      if (res.status === 'ACTIVE' || res.status === 'TRIALING') {
        router.replace('/painel/onboarding')
      } else {
        setStillPending(true)
      }
    })
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="flex items-center justify-center gap-2 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando pagamento...
      </p>

      {payState.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-left text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {payState.error}
        </p>
      )}
      {stillPending && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-left text-sm text-amber-700">
          Ainda não recebemos a confirmação. Se você pagou por PIX ou boleto, pode levar alguns
          minutos.
        </p>
      )}

      {canReopen && (
        <form action={payAction}>
          <Button type="submit" loading={paying} className="w-full">
            <CreditCard className="h-4 w-4" /> Pagar agora
          </Button>
        </form>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={verifyNow}
        loading={checking}
        className="w-full"
      >
        <RefreshCw className="h-4 w-4" /> Já paguei — verificar agora
      </Button>

      {slow && (
        <p className="rounded-xl bg-neutral-50 px-3 py-2 text-left text-sm text-neutral-600">
          Está demorando mais que o normal? Confirme se o pagamento foi concluído ou fale com a
          gente pelo WhatsApp.
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          <MessageCircle className="h-4 w-4" /> Falar com o suporte
        </a>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  )
}
