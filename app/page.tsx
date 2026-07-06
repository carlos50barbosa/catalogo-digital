import Link from 'next/link'
import {
  Smartphone,
  MessageCircle,
  ReceiptText,
  NotebookPen,
  Users,
  QrCode,
  Sparkles,
} from 'lucide-react'
import { config } from '@/lib/config'

// Página raiz / landing pública. Apresenta as principais funcionalidades do SaaS.
export const metadata = {
  title: 'Catálogo Digital — Vitrine e pedidos por WhatsApp para o seu negócio',
  description:
    'Monte a vitrine digital da sua loja e venda pelo WhatsApp, sem comissão de marketplace. Importe produtos pela nota fiscal, controle o fiado e divulgue com QR Code.',
  openGraph: {
    title: 'Catálogo Digital — Vitrine e pedidos por WhatsApp',
    description:
      'Vitrine digital + pedidos por WhatsApp para o seu negócio, sem comissão de marketplace.',
    type: 'website',
  },
}

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Vitrine no celular',
    desc: 'Catálogo rápido e bonito no seu link próprio (/sua-loja), com foto, categorias e busca.',
  },
  {
    icon: MessageCircle,
    title: 'Pedido pelo WhatsApp',
    desc: 'Sem comissão de marketplace: o cliente monta o carrinho e o pedido vai direto pro WhatsApp da loja, já formatado.',
  },
  {
    icon: ReceiptText,
    title: 'Importe pela nota fiscal',
    desc: 'Suba o XML da NF-e e monte o catálogo casando os itens pelo código de barras — também por CSV ou pela câmera.',
  },
  {
    icon: NotebookPen,
    title: 'Fiado digital',
    desc: 'Caderneta de fiado por cliente: saldo, histórico imutável e cobrança pronta no WhatsApp.',
  },
  {
    icon: Users,
    title: 'Clientes e pedidos',
    desc: 'Base de clientes reconhecida por telefone e histórico de pedidos, tudo organizado no painel.',
  },
  {
    icon: QrCode,
    title: 'Divulgação com QR Code',
    desc: 'Gere um cartaz com o QR Code da loja para os clientes pedirem pelo celular na hora.',
  },
]

export default function HomePage() {
  const year = new Date().getFullYear()
  const trialDays = config.signup.trialDays

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-16">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="Catálogo Digital" width={56} height={56} className="mb-6 h-14 w-14" />

          {trialDays > 0 && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-sm font-semibold text-green-700">
              <Sparkles className="h-4 w-4" /> {trialDays} dias grátis — sem cartão de crédito
            </span>
          )}

          <h1 className="font-display text-3xl font-bold text-neutral-900 sm:text-4xl">
            Catálogo Digital
          </h1>
          <p className="mt-3 max-w-xl text-neutral-600">
            Vitrine digital + pedidos por WhatsApp para o seu negócio. Tudo o que a sua loja
            precisa para vender online — <strong>sem comissão de marketplace</strong>.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/cadastro"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-green-600 px-6 text-sm font-medium text-white hover:bg-green-700"
            >
              {trialDays > 0 ? 'Começar teste grátis' : 'Criar minha loja'}
            </Link>
            <Link
              href="/painel/login"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Acessar o painel
            </Link>
          </div>
          {trialDays > 0 && (
            <p className="mt-3 text-xs text-neutral-500">
              Teste tudo por {trialDays} dias. Só peça um plano quando decidir continuar.
            </p>
          )}
        </div>

        {/* Funcionalidades */}
        <section className="mt-14 w-full">
          <h2 className="text-center font-display text-xl font-bold text-neutral-900">
            Tudo no mesmo lugar
          </h2>
          <p className="mx-auto mt-1 max-w-lg text-center text-sm text-neutral-500">
            Do catálogo ao recebimento, com as ferramentas do dia a dia do seu negócio.
          </p>

          <div className="mt-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display font-semibold text-neutral-900">{f.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-xs text-neutral-400">
          Tem uma loja? Acesse pelo link <code>/sua-loja</code>.
        </p>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-neutral-500">
          © {year} Catálogo Digital · Desenvolvido por{' '}
          <a
            href="https://servicostech.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
          >
            Serviços Tech
          </a>
        </div>
      </footer>
    </div>
  )
}
