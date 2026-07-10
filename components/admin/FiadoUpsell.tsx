import Link from 'next/link'
import { NotebookPen, Check } from 'lucide-react'

/**
 * Upsell do Fiado para planos que ainda não têm o recurso (ex.: Essencial).
 * Renderizado no lugar do conteúdo — o gating também é aplicado no servidor.
 */
export function FiadoUpsell() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Fiado</h1>
        <p className="text-sm text-neutral-500">Sua caderneta digital de fiado.</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <NotebookPen className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-neutral-900">
          O controle de fiado não está disponível no seu plano atual
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Troque o caderninho por uma caderneta digital: registre dívidas e pagamentos, veja o
          saldo de cada cliente e cobre pelo WhatsApp com um toque.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-neutral-700">
          {[
            'Conta de fiado por cliente, com saldo e histórico imutável',
            'Lançar compras e pagamentos em segundos',
            'Total a receber e lista de quem está em atraso',
            'Cobrança pronta no WhatsApp (você envia do seu número)',
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> {f}
            </li>
          ))}
        </ul>
        <Link
          href="/painel/assinatura"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Ver planos e fazer upgrade
        </Link>
      </div>
    </div>
  )
}
