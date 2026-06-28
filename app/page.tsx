import Link from 'next/link'
import { Store, Smartphone, MessageCircle } from 'lucide-react'

// Página raiz institucional simples. A landing de vendas do SaaS é FASE 2.
export const metadata = {
  robots: { index: false },
}

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-white">
        <Store className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-bold text-neutral-900 sm:text-4xl">
        Catálogo Digital
      </h1>
      <p className="mt-3 max-w-xl text-neutral-600">
        Vitrine digital + pedidos por WhatsApp para mercadinhos de bairro. Sem comissão de
        marketplace: o pedido vai direto pro WhatsApp da loja.
      </p>

      <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
        {[
          { icon: Smartphone, title: 'Vitrine no celular', desc: 'Catálogo rápido e bonito.' },
          { icon: MessageCircle, title: 'Pedido no WhatsApp', desc: 'Mensagem já formatada.' },
          { icon: Store, title: 'Painel simples', desc: 'O dono no controle.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card">
            <f.icon className="h-6 w-6 text-green-600" />
            <h2 className="mt-3 font-display font-semibold text-neutral-900">{f.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link
          href="/painel/login"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Acessar o painel
        </Link>
      </div>

      <p className="mt-8 text-xs text-neutral-400">
        Tem uma loja? Acesse pelo link <code>/sua-loja</code>.
      </p>
    </main>
  )
}
