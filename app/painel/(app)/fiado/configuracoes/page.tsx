import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireOnboardedStore } from '@/lib/auth-helpers'
import { getFiadoAccess } from '@/lib/data/fiado'
import { decimalToNumber } from '@/lib/format'
import { FiadoUpsell } from '@/components/admin/FiadoUpsell'
import { FiadoSettingsForm } from '@/components/admin/FiadoSettingsForm'

export const dynamic = 'force-dynamic'

export default async function FiadoSettingsPage() {
  const { storeId } = await requireOnboardedStore()
  const access = await getFiadoAccess(storeId)

  if (!access.planAllows) return <FiadoUpsell />

  const s = access.settings
  return (
    <div className="space-y-5">
      <Link
        href="/painel/fiado"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao fiado
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Configurações de fiado</h1>
        <p className="text-sm text-neutral-500">
          Ative o fiado, defina o prazo e o limite padrão e personalize a cobrança.
        </p>
      </div>

      <FiadoSettingsForm
        initial={{
          fiadoEnabled: s?.fiadoEnabled ?? true,
          fiadoDefaultTermDays: s?.fiadoDefaultTermDays ?? 30,
          fiadoDefaultCreditLimit: s ? decimalToNumber(s.fiadoDefaultCreditLimit) : 0,
          fiadoReminderTemplate: s?.fiadoReminderTemplate ?? null,
        }}
      />
    </div>
  )
}
