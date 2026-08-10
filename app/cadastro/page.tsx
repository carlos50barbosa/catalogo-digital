import type { Metadata } from 'next'
import { ShieldCheck, Wrench, MessageCircle } from 'lucide-react'
import { CadastroForm } from '@/components/signup/CadastroForm'
import { parsePlan, planFeatures } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Criar minha loja — Catálogo Digital',
  description: 'Monte sua loja digital e venda pelo WhatsApp, sem comissão.',
}

export const dynamic = 'force-dynamic'

const SELOS = [
  { icon: ShieldCheck, label: 'Sem comissão por venda' },
  { icon: MessageCircle, label: 'Pedidos no seu WhatsApp' },
  { icon: Wrench, label: 'Fácil de configurar' },
]

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>
}) {
  // Plano escolhido na vitrine de preços da home (só uma intenção — o plano
  // cobrado é o confirmado depois, em /cadastro/plano).
  const plan = parsePlan((await searchParams).plano)

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark.svg"
            alt="Catálogo Digital"
            width={48}
            height={48}
            className="mx-auto mb-3 h-12 w-12"
          />
          <h1 className="font-display text-2xl font-bold text-neutral-900">Crie sua loja digital</h1>
          <p className="mt-1 text-neutral-500">
            Em poucos minutos sua loja vende pelo WhatsApp.
          </p>
          {plan && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-800">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Plano <strong>{planFeatures(plan).label}</strong> guardado para depois do cadastro
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <CadastroForm plan={plan} />
        </div>

        <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {SELOS.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5 text-sm text-neutral-600">
              <s.icon className="h-4 w-4 text-green-600" /> {s.label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
