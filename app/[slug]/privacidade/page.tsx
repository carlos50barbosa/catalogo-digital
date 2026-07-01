import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getStoreBySlug } from '@/lib/data/stores'
import { can } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  robots: { index: false },
}

export default async function PrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) notFound()

  // Cláusula de fiado só aparece quando a loja realmente oferece o recurso.
  const offersFiado = can(store.plan, 'fiado') && (store.settings?.fiadoEnabled ?? false)

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/${slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para a loja
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">
        Política de Privacidade
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{store.name}</p>

      {/* MODELO — deve ser revisado por um responsável antes de produção. */}
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-700">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
          <strong>Aviso:</strong> este é um modelo inicial de política de privacidade. Revise com
          um responsável antes de usar em produção.
        </p>

        <section>
          <h2 className="font-semibold text-neutral-900">1. Quais dados coletamos</h2>
          <p>
            Ao fazer um pedido, coletamos seu <strong>nome</strong>, <strong>telefone</strong> e,
            quando a entrega é solicitada, o <strong>endereço</strong>. Também registramos os itens
            e valores do pedido gerado.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">2. Como usamos seus dados</h2>
          <p>
            Os dados são usados por {store.name} para receber, organizar e atender o seu pedido, e
            para eventual contato sobre ele via WhatsApp. Não vendemos nem compartilhamos seus dados
            com terceiros para fins de marketing.
          </p>
          <p className="mt-2">
            Se você marcar a opção <em>&ldquo;receber ofertas e novidades&rdquo;</em> no checkout,{' '}
            {store.name} poderá enviar promoções pelo WhatsApp. Esse consentimento é{' '}
            <strong>opcional</strong> e pode ser revogado a qualquer momento pedindo à loja.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">3. Base legal (LGPD)</h2>
          <p>
            O tratamento ocorre com base no seu <strong>consentimento</strong> e na necessidade de{' '}
            <strong>execução do pedido</strong>, conforme a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">4. Seus direitos</h2>
          <p>
            Você pode solicitar a qualquer momento o acesso, a correção ou a exclusão dos seus
            dados, entrando em contato com {store.name} pelo WhatsApp da loja.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-neutral-900">5. Retenção</h2>
          <p>
            Mantemos os dados do pedido pelo tempo necessário ao atendimento e a obrigações legais,
            descartando-os quando não forem mais necessários.
          </p>
        </section>

        {offersFiado && (
          <section>
            <h2 className="font-semibold text-neutral-900">6. Fiado (controle de crédito)</h2>
            <p>
              Caso você compre <strong>fiado</strong> (a prazo) com {store.name}, registramos os{' '}
              <strong>valores das compras e pagamentos</strong>, o saldo devedor e as datas, para{' '}
              <strong>controle de crédito e cobrança</strong>. Esses dados financeiros são tratados
              com base na <strong>execução do contrato</strong> entre você e a loja e no{' '}
              <strong>legítimo interesse</strong> de receber pelos produtos vendidos, e ficam
              acessíveis apenas a {store.name} (não aparecem na loja online). A cobrança, quando
              houver, é feita diretamente pela loja (por exemplo, via WhatsApp).
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
