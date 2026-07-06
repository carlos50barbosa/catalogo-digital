import Link from 'next/link'
import { Sparkles } from 'lucide-react'

/**
 * Faixa de contagem regressiva do teste grátis (sem cartão), exibida no painel
 * enquanto a loja está TRIALING. Leva ao checkout self-service (/cadastro/plano),
 * que é quem cria a assinatura no gateway e converte o trial em ACTIVE.
 */
export function TrialBanner({ endsAt }: { endsAt: Date }) {
  const ms = endsAt.getTime() - Date.now()
  const days = Math.max(0, Math.ceil(ms / 86_400_000))
  const restante =
    days <= 0 ? 'Seu teste termina hoje' : days === 1 ? 'Falta 1 dia de teste' : `Faltam ${days} dias de teste`

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
      <span className="flex items-center gap-2 font-medium text-neutral-800">
        <Sparkles className="h-4 w-4 shrink-0 text-accent" /> {restante} grátis. Assine para não
        perder sua loja no ar.
      </span>
      <Link
        href="/cadastro/plano"
        className="inline-flex h-9 shrink-0 items-center rounded-lg bg-accent px-3 font-semibold text-accent-fg hover:opacity-90"
      >
        Assinar agora
      </Link>
    </div>
  )
}
