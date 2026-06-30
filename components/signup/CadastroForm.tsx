'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, Store } from 'lucide-react'
import { signupAction } from '@/app/cadastro/actions'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'
import { slugify } from '@/lib/utils'

export function CadastroForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialActionState)
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')

  const previewSlug = (slug ? slugify(slug) : slugify(storeName)) || 'sua-loja'

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ownerName">Seu nome</Label>
          <Input id="ownerName" name="ownerName" required placeholder="Como te chamamos" />
          <FieldError message={state.fieldErrors?.ownerName} />
        </div>
        <div>
          <Label htmlFor="storeName">Nome do mercadinho</Label>
          <Input
            id="storeName"
            name="storeName"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Ex.: Mercadinho do Zé"
          />
          <FieldError message={state.fieldErrors?.storeName} />
        </div>
      </div>

      <div>
        <Label htmlFor="slug">Link da loja (opcional)</Label>
        <div className="flex items-center gap-1 rounded-xl border border-neutral-300 bg-white px-3">
          <span className="text-sm text-neutral-400">cataloggo.app.br/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(storeName) || 'sua-loja'}
            className="h-11 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Sua loja ficará em <strong>cataloggo.app.br/{previewSlug}</strong> (deixe em branco para gerar
          automático).
        </p>
        <FieldError message={state.fieldErrors?.slug} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            inputMode="numeric"
            required
            placeholder="82988887777"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Só o DDD e o número — o 55 do Brasil entra automático. Ex.: 82988887777
          </p>
          <FieldError message={state.fieldErrors?.whatsapp} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
          <FieldError message={state.fieldErrors?.email} />
        </div>
      </div>

      <div>
        <Label htmlFor="password">Crie uma senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="mín. 8 caracteres, com letra e número"
        />
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <Button type="submit" loading={pending} size="lg" className="w-full">
        <Store className="h-5 w-5" /> Criar minha loja
      </Button>

      <p className="text-center text-sm text-neutral-500">
        Já tem conta?{' '}
        <a href="/painel/login" className="font-medium text-accent underline">
          Entrar
        </a>
      </p>
    </form>
  )
}
