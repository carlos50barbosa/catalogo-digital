'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { AlertCircle, CheckCircle2, ImagePlus, Store as StoreIcon } from 'lucide-react'
import { updateSettingsAction } from '@/app/painel/_actions/settings'
import { initialActionState } from '@/lib/action-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label, FieldError } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { WEEKDAY_LABELS } from '@/lib/store-hours'
import type { Fulfillment, OpeningHours } from '@/lib/types'

export type SettingsInitial = {
  name: string
  logoUrl: string | null
  whatsappNumber: string
  accentColor: string | null
  address: string | null
  deliveryFee: number
  minOrderValue: number
  pixKey: string | null
  fulfillment: Fulfillment
  deliveryZones: string[]
  openingHours: OpeningHours | null
  showOutOfStock: boolean
  orderMessageTemplate: string | null
}

export function SettingsForm({
  initial,
  canCustomMessage = true,
}: {
  initial: SettingsInitial
  canCustomMessage?: boolean
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialActionState)

  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [accent, setAccent] = useState(initial.accentColor ?? '#16a34a')
  const [closed, setClosed] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {}
    for (let d = 0; d < 7; d++) m[d] = !initial.openingHours?.[String(d)]
    return m
  })

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="logoUrl" value={logoUrl} />

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.message}
        </p>
      )}

      {/* Identidade */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade da loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Pré-visualização" fill className="object-cover" sizes="80px" unoptimized />
                ) : logoUrl ? (
                  <Image src={logoUrl} alt="Logo atual" fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-300">
                    <StoreIcon className="h-7 w-7" />
                  </div>
                )}
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                <ImagePlus className="h-4 w-4" />
                Enviar logo
                <input
                  type="file"
                  name="logo"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setLogoPreview(f ? URL.createObjectURL(f) : null)
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nome da loja</Label>
            <Input id="name" name="name" defaultValue={initial.name} required />
            <FieldError message={state.fieldErrors?.name} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp (com DDI e DDD)</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                defaultValue={initial.whatsappNumber}
                placeholder="5582999999999"
                inputMode="numeric"
                required
              />
              <FieldError message={state.fieldErrors?.whatsappNumber} />
            </div>
            <div>
              <Label htmlFor="accentColor">Cor de destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accentColor"
                  name="accentColor"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-neutral-300"
                />
                <span className="font-mono text-sm text-neutral-600">{accent}</span>
              </div>
              <FieldError message={state.fieldErrors?.accentColor} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entrega e retirada */}
      <Card>
        <CardHeader>
          <CardTitle>Entrega e retirada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fulfillment">Modalidade</Label>
            <Select id="fulfillment" name="fulfillment" defaultValue={initial.fulfillment}>
              <option value="DELIVERY_AND_PICKUP">Entrega e retirada</option>
              <option value="DELIVERY_ONLY">Somente entrega</option>
              <option value="PICKUP_ONLY">Somente retirada</option>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="deliveryFee">Taxa de entrega (R$)</Label>
              <Input
                id="deliveryFee"
                name="deliveryFee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial.deliveryFee}
              />
            </div>
            <div>
              <Label htmlFor="minOrderValue">Pedido mínimo (R$)</Label>
              <Input
                id="minOrderValue"
                name="minOrderValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial.minOrderValue}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="deliveryZones">Bairros atendidos (um por linha)</Label>
            <Textarea
              id="deliveryZones"
              name="deliveryZones"
              rows={3}
              defaultValue={initial.deliveryZones.join('\n')}
              placeholder={'Centro\nFarol\nJatiúca'}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Se preenchido, o cliente escolhe o bairro no checkout.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="pixKey">Chave PIX</Label>
          <Input
            id="pixKey"
            name="pixKey"
            defaultValue={initial.pixKey ?? ''}
            placeholder="email, telefone, CPF/CNPJ ou aleatória"
          />
        </CardContent>
      </Card>

      {/* Endereço e horários */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço e horários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              defaultValue={initial.address ?? ''}
              placeholder="Rua, número - Bairro"
            />
          </div>
          <div className="space-y-2">
            <Label>Horário de funcionamento</Label>
            {WEEKDAY_LABELS.map((label, d) => {
              const today = initial.openingHours?.[String(d)]
              return (
                <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-20 text-neutral-600">{label}</span>
                  <label className="flex items-center gap-1.5 text-neutral-500">
                    <input
                      type="checkbox"
                      name={`oh_${d}_closed`}
                      checked={closed[d]}
                      onChange={(e) => setClosed((p) => ({ ...p, [d]: e.target.checked }))}
                      className="h-4 w-4 rounded border-neutral-300 accent-[var(--accent)]"
                    />
                    Fechado
                  </label>
                  <input
                    type="time"
                    name={`oh_${d}_open`}
                    defaultValue={today?.open ?? '08:00'}
                    disabled={closed[d]}
                    className="h-9 rounded-lg border border-neutral-300 px-2 disabled:opacity-40"
                  />
                  <span className="text-neutral-400">às</span>
                  <input
                    type="time"
                    name={`oh_${d}_close`}
                    defaultValue={today?.close ?? '18:00'}
                    disabled={closed[d]}
                    className="h-9 rounded-lg border border-neutral-300 px-2 disabled:opacity-40"
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vitrine e mensagem */}
      <Card>
        <CardHeader>
          <CardTitle>Vitrine e pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="showOutOfStock"
              defaultChecked={initial.showOutOfStock}
              className="h-4 w-4 rounded border-neutral-300 accent-[var(--accent)]"
            />
            Mostrar produtos esgotados (desmarque para ocultá-los)
          </label>
          {canCustomMessage ? (
            <div>
              <Label htmlFor="orderMessageTemplate">Mensagem do pedido (opcional)</Label>
              <Textarea
                id="orderMessageTemplate"
                name="orderMessageTemplate"
                rows={4}
                defaultValue={initial.orderMessageTemplate ?? ''}
                placeholder={'Deixe em branco para usar o padrão. Variáveis: {loja} {itens} {subtotal} {taxa} {total} {tipo} {cliente} {endereco} {pagamento}'}
              />
              <p className="mt-1 text-xs text-neutral-400">
                Variáveis disponíveis: {'{loja} {itens} {subtotal} {taxa} {total} {tipo} {cliente} {endereco} {pagamento}'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
              ✨ Personalizar a mensagem do pedido está disponível nos planos Profissional e Premium.{' '}
              <a href="/painel/assinatura" className="font-medium text-accent underline">
                Ver meu plano
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" loading={pending} size="lg" className="w-full shadow-lg">
          Salvar configurações
        </Button>
      </div>
    </form>
  )
}
