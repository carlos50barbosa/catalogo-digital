'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, Store, ShoppingCart, Sandwich } from 'lucide-react'
import { signupAction } from '@/app/cadastro/actions'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'
import { slugify, formatBrPhone, cn } from '@/lib/utils'
import { SEGMENT_LIST, DEFAULT_SEGMENT } from '@/lib/segment'

const SEGMENT_ICONS = { MERCADO: ShoppingCart, LANCHONETE: Sandwich } as const

export function CadastroForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialActionState)
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [segment, setSegment] = useState<string>(DEFAULT_SEGMENT)

  const previewSlug = (slug ? slugify(slug) : slugify(storeName)) || 'sua-loja'

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-neutral-700">O que você vende?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SEGMENT_LIST.map((s) => {
            const Icon = SEGMENT_ICONS[s.value]
            const checked = segment === s.value
            return (
              <label
                key={s.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                  checked
                    ? 'border-accent bg-green-50/60 ring-1 ring-accent'
                    : 'border-neutral-300 bg-white hover:bg-neutral-50',
                )}
              >
                <input
                  type="radio"
                  name="segment"
                  value={s.value}
                  checked={checked}
                  onChange={() => setSegment(s.value)}
                  className="sr-only"
                />
                <Icon
                  className={cn('mt-0.5 h-5 w-5 shrink-0', checked ? 'text-accent' : 'text-neutral-400')}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900">{s.label}</span>
                  <span className="block text-xs text-neutral-500">{s.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-neutral-400">Dá para mudar depois nas configurações.</p>
        <FieldError message={state.fieldErrors?.segment} />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ownerName">Seu nome</Label>
          <Input id="ownerName" name="ownerName" required placeholder="Como te chamamos" />
          <FieldError message={state.fieldErrors?.ownerName} />
        </div>
        <div>
          <Label htmlFor="storeName">Nome da loja</Label>
          <Input
            id="storeName"
            name="storeName"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Ex.: Loja do Zé"
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
            type="tel"
            inputMode="numeric"
            required
            maxLength={15}
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatBrPhone(e.target.value))}
            placeholder="(82) 98888-7777"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Só o DDD e o número — o 55 do Brasil entra automático.
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
