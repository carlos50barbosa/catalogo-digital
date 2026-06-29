'use client'

import { useState, useTransition } from 'react'
import { resendVerificationAction } from '@/app/cadastro/actions'

export function ResendButton() {
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending || sent}
      onClick={() =>
        startTransition(async () => {
          await resendVerificationAction()
          setSent(true)
        })
      }
      className="font-medium text-accent underline disabled:opacity-60"
    >
      {sent ? 'E-mail reenviado!' : pending ? 'Enviando...' : 'Reenviar e-mail'}
    </button>
  )
}
