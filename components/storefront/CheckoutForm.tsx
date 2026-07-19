'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, MessageCircle, AlertCircle, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label, FieldError } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatBRL } from '@/lib/format'
import { createOrderAction } from '@/app/_actions/checkout'
import { cn, formatBrPhone } from '@/lib/utils'
import type { CartItem, SerializedSettings, SerializedStore } from '@/lib/types'

type FulfillmentType = 'DELIVERY' | 'PICKUP'
const PAYMENTS = ['Dinheiro', 'Cartão na entrega', 'PIX'] as const

export function CheckoutForm({
  store,
  settings,
  items,
  subtotal,
  onBack,
  onConfirmed,
}: {
  store: SerializedStore
  settings: SerializedSettings
  items: CartItem[]
  subtotal: number
  onBack: () => void
  onConfirmed: (waUrl: string) => void
}) {
  const allowDelivery = settings.fulfillment !== 'PICKUP_ONLY'
  const allowPickup = settings.fulfillment !== 'DELIVERY_ONLY'
  const hasZones = settings.deliveryZones.length > 0
  const hasWeighed = items.some((i) => i.unit === 'KG')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<FulfillmentType>(allowDelivery ? 'DELIVERY' : 'PICKUP')
  const [zone, setZone] = useState('')
  const [address, setAddress] = useState('')
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]>('Dinheiro')
  const [consent, setConsent] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const isDelivery = type === 'DELIVERY'
  const deliveryFee = isDelivery ? settings.deliveryFee : 0
  const total = subtotal + deliveryFee
  const belowMin = subtotal < settings.minOrderValue

  const fullAddress = useMemo(() => {
    if (!isDelivery) return ''
    if (hasZones) return [zone, address].filter(Boolean).join(' - ')
    return address.trim()
  }, [isDelivery, hasZones, zone, address])

  function copyPix() {
    if (!settings.pixKey) return
    navigator.clipboard?.writeText(settings.pixKey).then(() => {
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 1800)
    })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Informe seu nome.'
    if (phone.replace(/\D/g, '').length < 10) e.phone = 'Informe um telefone com DDD.'
    if (isDelivery) {
      if (hasZones && !zone) e.zone = 'Selecione o bairro.'
      if (!fullAddress) e.address = 'Informe o endereço de entrega.'
    }
    if (!consent) e.consent = 'É necessário aceitar a política de privacidade.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    setServerError(null)
    if (belowMin || !validate()) return

    startTransition(async () => {
      const res = await createOrderAction({
        slug: store.slug,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        fulfillment: type,
        address: fullAddress || null,
        paymentMethod: payment,
        consent,
        marketingConsent: marketing,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          optionIds: i.optionIds,
          notes: i.notes,
        })),
      })

      if (res.ok) {
        // tenta abrir o WhatsApp; a tela de confirmação tem botão de reabrir.
        window.open(res.waUrl, '_blank', 'noopener')
        onConfirmed(res.waUrl)
      } else if (res.fieldErrors) {
        setErrors(res.fieldErrors)
      } else {
        setServerError(res.error ?? 'Não foi possível registrar o pedido.')
      }
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
        </button>

        {serverError && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {serverError}
          </p>
        )}

        {hasWeighed && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <Scale className="mt-0.5 h-4 w-4 shrink-0" />
            Itens por peso (kg) têm <strong>valor aproximado</strong>, confirmado na pesagem.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="co-name">Seu nome</Label>
            <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            <FieldError message={errors.name || errors.customerName} />
          </div>
          <div>
            <Label htmlFor="co-phone">WhatsApp / telefone</Label>
            <Input
              id="co-phone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(formatBrPhone(e.target.value))}
              placeholder="(82) 99999-9999"
            />
            <FieldError message={errors.phone || errors.customerPhone} />
          </div>
        </div>

        {allowDelivery && allowPickup && (
          <div>
            <Label>Como você quer receber?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['DELIVERY', 'PICKUP'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setType(opt)}
                  className={cn(
                    'h-11 rounded-xl border text-sm font-medium transition',
                    type === opt
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
                  )}
                >
                  {opt === 'DELIVERY' ? 'Entrega' : 'Retirada'}
                </button>
              ))}
            </div>
          </div>
        )}

        {isDelivery && (
          <div className="space-y-3">
            {hasZones && (
              <div>
                <Label htmlFor="co-zone">Bairro</Label>
                <Select id="co-zone" value={zone} onChange={(e) => setZone(e.target.value)}>
                  <option value="">Selecione o bairro</option>
                  {settings.deliveryZones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.zone} />
              </div>
            )}
            <div>
              <Label htmlFor="co-address">
                {hasZones ? 'Endereço (rua, número, complemento)' : 'Endereço de entrega'}
              </Label>
              <Input id="co-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, complemento" />
              <FieldError message={errors.address} />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="co-pay">Forma de pagamento</Label>
          <Select id="co-pay" value={payment} onChange={(e) => setPayment(e.target.value as (typeof PAYMENTS)[number])}>
            {PAYMENTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>

          {payment === 'PIX' && settings.pixKey && (
            <>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-neutral-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">Chave PIX</p>
                  <p className="truncate text-sm font-medium text-neutral-800">{settings.pixKey}</p>
                </div>
                <button
                  type="button"
                  onClick={copyPix}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50"
                >
                  {pixCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {pixCopied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                A confirmação do pagamento PIX é feita pelo {store.name}.
              </p>
            </>
          )}
        </div>

        {/* Resumo */}
        <div className="space-y-1 rounded-xl border border-neutral-200 p-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal{hasWeighed ? ' (aprox.)' : ''}</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {isDelivery && (
            <div className="flex justify-between text-neutral-600">
              <span>Taxa de entrega</span>
              <span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold text-neutral-900">
            <span>Total{hasWeighed ? ' (aprox.)' : ''}</span>
            <span>{formatBRL(total)}</span>
          </div>
        </div>

        {belowMin && (
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Pedido mínimo de {formatBRL(settings.minOrderValue)}. Adicione mais itens.
          </p>
        )}

        {/* LGPD: consentimento */}
        <div>
          <label className="flex items-start gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[var(--accent)]"
            />
            <span>
              Concordo em compartilhar meus dados com {store.name} para processar o pedido. Ver a{' '}
              <Link href={`/${store.slug}/privacidade`} target="_blank" className="text-accent underline">
                política de privacidade
              </Link>
              .
            </span>
          </label>
          <FieldError message={errors.consent} />
        </div>

        {/* Opt-in OPCIONAL de marketing (LGPD: finalidade separada da execução do pedido) */}
        <label className="flex items-start gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[var(--accent)]"
          />
          <span>
            Quero receber ofertas e novidades do {store.name} pelo WhatsApp. (opcional)
          </span>
        </label>
      </div>

      <div className="border-t border-neutral-200 p-4">
        <Button onClick={handleSubmit} disabled={belowMin} loading={pending} className="w-full" size="lg">
          <MessageCircle className="h-5 w-5" />
          Enviar pedido pelo WhatsApp
        </Button>
      </div>
    </div>
  )
}
