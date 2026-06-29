'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { checkActivationAction } from '@/app/cadastro/plano/actions'

/** Faz polling leve do status da loja; quando ativa, leva ao onboarding. */
export function AguardandoPoller() {
  const router = useRouter()

  useEffect(() => {
    let active = true
    const id = setInterval(async () => {
      const res = await checkActivationAction()
      if (!active) return
      if (res.status === 'ACTIVE' || res.status === 'TRIALING') {
        clearInterval(id)
        router.replace('/painel/onboarding')
      }
    }, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [router])

  return null
}
