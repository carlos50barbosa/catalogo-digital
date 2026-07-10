'use client'

import { useActionState } from 'react'
import { updateFiadoSettingsAction } from '@/app/painel/_actions/fiado'
import { initialActionState } from '@/lib/action-state'
import { useActionToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label, FieldError } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export type FiadoSettingsInitial = {
  fiadoEnabled: boolean
  fiadoDefaultTermDays: number
  fiadoDefaultCreditLimit: number
  fiadoReminderTemplate: string | null
}

export function FiadoSettingsForm({ initial }: { initial: FiadoSettingsInitial }) {
  const [state, formAction, pending] = useActionState(updateFiadoSettingsAction, initialActionState)
  useActionToast(state)

  return (
    <form action={formAction} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Fiado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="fiadoEnabled"
              defaultChecked={initial.fiadoEnabled}
              className="h-4 w-4 rounded border-neutral-300 accent-[var(--accent)]"
            />
            Ativar o controle de fiado nesta loja
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fiadoDefaultTermDays">Prazo padrão (dias)</Label>
              <Input
                id="fiadoDefaultTermDays"
                name="fiadoDefaultTermDays"
                type="number"
                min="0"
                max="365"
                step="1"
                defaultValue={initial.fiadoDefaultTermDays}
              />
              <FieldError message={state.fieldErrors?.fiadoDefaultTermDays} />
              <p className="mt-1 text-xs text-neutral-400">
                Vencimento sugerido de cada compra = hoje + este número de dias.
              </p>
            </div>
            <div>
              <Label htmlFor="fiadoDefaultCreditLimit">Limite padrão (R$)</Label>
              <Input
                id="fiadoDefaultCreditLimit"
                name="fiadoDefaultCreditLimit"
                type="number"
                min="0"
                step="0.01"
                defaultValue={initial.fiadoDefaultCreditLimit}
              />
              <FieldError message={state.fieldErrors?.fiadoDefaultCreditLimit} />
              <p className="mt-1 text-xs text-neutral-400">0 = sem limite. Pode ajustar por cliente.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="fiadoReminderTemplate">Mensagem de cobrança (opcional)</Label>
            <Textarea
              id="fiadoReminderTemplate"
              name="fiadoReminderTemplate"
              rows={3}
              defaultValue={initial.fiadoReminderTemplate ?? ''}
              placeholder={'Deixe em branco para usar o padrão. Variáveis: {nome} {loja} {saldo}'}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Variáveis disponíveis: {'{nome} {loja} {saldo}'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" loading={pending} size="lg" className="w-full shadow-lg">
          Salvar configurações de fiado
        </Button>
      </div>
    </form>
  )
}
