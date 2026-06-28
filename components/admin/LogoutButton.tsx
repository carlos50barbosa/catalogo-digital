'use client'

import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/painel/_actions/account'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </form>
  )
}
