'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { publishStoreAction } from '@/app/painel/_actions/onboarding'

export function OnboardingPublishButton({ canPublish }: { canPublish: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <Button
        size="lg"
        disabled={!canPublish}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const res = await publishStoreAction()
            if (res.ok) router.push('/painel')
            else setError(res.error ?? 'Não foi possível publicar.')
          })
        }
      >
        <Rocket className="h-5 w-5" /> Publicar minha loja
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
