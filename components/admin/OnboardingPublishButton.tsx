'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { publishStoreAction } from '@/app/painel/_actions/onboarding'

export function OnboardingPublishButton({ canPublish }: { canPublish: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div>
      <Button
        size="lg"
        disabled={!canPublish}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await publishStoreAction()
            if (res.ok) router.push('/painel')
            else toast.error(res.error ?? 'Não foi possível publicar.')
          })
        }
      >
        <Rocket className="h-5 w-5" /> Publicar minha loja
      </Button>
    </div>
  )
}
