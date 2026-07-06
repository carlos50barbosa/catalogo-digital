'use client'

import { useFormStatus } from 'react-dom'
import { Sparkles } from 'lucide-react'
import { startTrialAction } from '@/app/cadastro/plano/actions'
import { Button } from '@/components/ui/button'

function Submit({ trialDays }: { trialDays: number }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} size="lg" variant="outline" className="w-full">
      <Sparkles className="h-5 w-5" /> Começar teste grátis de {trialDays} dias
    </Button>
  )
}

/** CTA do teste grátis sem cartão (self-service). Submete uma server action. */
export function StartTrialButton({ trialDays }: { trialDays: number }) {
  return (
    <form action={startTrialAction}>
      <Submit trialDays={trialDays} />
    </form>
  )
}
