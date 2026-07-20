import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireStore } from '@/lib/auth-helpers'
import { getOrder } from '@/lib/data/orders'
import { getStoreForPanel } from '@/lib/data/stores'
import { readOptionSnapshot } from '@/lib/order/options-snapshot'
import { formatBRL, decimalToNumber, formatDateTimeBR, formatQtyWithUnit } from '@/lib/format'
import { AutoPrint } from '@/components/admin/AutoPrint'

// Fica FORA do route group (app) de propósito: sem menu lateral, sem barra
// inferior, sem nada que suje o papel.
export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Via = 'cozinha' | 'cliente'

export default async function ComandaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ via?: string; print?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const via: Via = sp.via === 'cliente' ? 'cliente' : 'cozinha'

  const { storeId } = await requireStore()
  const [order, store] = await Promise.all([
    getOrder(storeId, id), // escopado por storeId
    getStoreForPanel(storeId),
  ])
  if (!order) notFound()

  const larguraMm = store?.settings?.receiptWidth ?? 80
  const isDelivery = order.fulfillment === 'DELIVERY'
  const paraCozinha = via === 'cozinha'

  return (
    <>
      {/*
        A largura do papel entra como CSS var e no @page. Sem `size` correto o
        driver centraliza numa folha A4 imaginária e sai um fio de papel.
        margin 0 porque impressora térmica não tem margem física.
      */}
      <style>{`
        @page { size: ${larguraMm}mm auto; margin: 0; }
        :root { --papel: ${larguraMm}mm; }
        html, body { background: #fff; }
        /*
          globals.css esconde tudo na impressão (body *) e só revela .print-area,
          regra criada para o cartaz de QR Code — que é A4 e centralizado com
          position:absolute. Bobina térmica precisa de fluxo normal, então a
          classe dupla (especificidade 2 > 1) desfaz o posicionamento sem mexer
          na regra global e quebrar o cartaz.
        */
        .comanda.print-area { position: static; inset: auto; margin: 0 auto; }
        .comanda {
          width: var(--papel);
          padding: 3mm;
          margin: 0 auto;
          font-family: ui-monospace, "Courier New", monospace;
          color: #000;
          font-size: ${paraCozinha ? '13px' : '12px'};
          line-height: 1.35;
        }
        .comanda hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
        .linha { display: flex; justify-content: space-between; gap: 2mm; }
        .item { margin-top: 2mm; }
        .item-nome { font-weight: 700; font-size: ${paraCozinha ? '17px' : '13px'}; }
        /* Na cozinha o adicional pesa tanto quanto a remoção: quem monta o
           lanche precisa ler "+ Bacon" de longe, não só o "SEM CEBOLA". */
        .opt { padding-left: 4mm; ${paraCozinha ? 'font-size: 15px;' : ''} }
        .sem { font-weight: 700; text-transform: uppercase; }
        .obs {
          padding-left: 4mm; font-weight: 700;
          ${paraCozinha ? 'font-size: 15px; border-left: 2px solid #000; padding-left: 3mm;' : ''}
        }
        .centro { text-align: center; }
        .titulo { font-weight: 700; font-size: ${paraCozinha ? '20px' : '15px'}; }
        /* .no-print já é escondido pelo globals.css. */
        @media screen {
          body { background: #e5e5e5; padding: 16px 0; }
          .comanda { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
        }
      `}</style>

      {sp.print === '1' && <AutoPrint />}

      <div className="no-print" style={{ textAlign: 'center', marginBottom: 12 }}>
        <a
          href={`/painel/comanda/${order.id}?via=cozinha`}
          style={{ margin: '0 6px', fontWeight: paraCozinha ? 700 : 400 }}
        >
          Cozinha
        </a>
        <a
          href={`/painel/comanda/${order.id}?via=cliente`}
          style={{ margin: '0 6px', fontWeight: !paraCozinha ? 700 : 400 }}
        >
          Cliente
        </a>
        <span style={{ margin: '0 6px', color: '#666' }}>| papel {larguraMm}mm</span>
        <a href={`/painel/pedidos/${order.id}`} style={{ margin: '0 6px' }}>
          voltar
        </a>
      </div>

      <div className="comanda print-area">
        <div className="centro">
          <div className="titulo">{paraCozinha ? 'COZINHA' : store?.name}</div>
          {!paraCozinha && <div>Pedido {order.id.slice(-6).toUpperCase()}</div>}
          {paraCozinha && (
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              #{order.id.slice(-6).toUpperCase()}
            </div>
          )}
          <div>{formatDateTimeBR(order.createdAt)}</div>
        </div>

        <hr />

        <div className="linha">
          <span>{isDelivery ? 'ENTREGA' : 'RETIRADA'}</span>
          <span>{order.customerName}</span>
        </div>
        {isDelivery && order.address && <div>{order.address}</div>}

        <hr />

        {/* Itens */}
        {order.items.map((it) => {
          const options = readOptionSnapshot(it.options)
          const qtd = formatQtyWithUnit(decimalToNumber(it.quantity), it.unit)
          return (
            <div key={it.id} className="item">
              <div className="linha">
                <span className="item-nome">
                  {qtd} {it.name}
                </span>
                {/* Cozinha não vê preço: valor na chapa só atrapalha. */}
                {!paraCozinha && <span>{formatBRL(decimalToNumber(it.lineTotal))}</span>}
              </div>

              {options.map((o, i) => (
                <div key={i} className={o.removed ? 'opt sem' : 'opt'}>
                  {o.removed ? `>> SEM ${o.name}` : `+ ${o.name}`}
                  {!paraCozinha && !o.removed && o.priceDelta !== 0 && ` (${formatBRL(o.priceDelta)})`}
                </div>
              ))}

              {it.notes && <div className="obs">OBS: {it.notes}</div>}
            </div>
          )
        })}

        <hr />

        {paraCozinha ? (
          <div className="centro" style={{ fontWeight: 700 }}>
            {order.items.length} {order.items.length === 1 ? 'ITEM' : 'ITENS'}
          </div>
        ) : (
          <>
            <div className="linha">
              <span>Subtotal</span>
              <span>{formatBRL(decimalToNumber(order.subtotal))}</span>
            </div>
            {isDelivery && (
              <div className="linha">
                <span>Entrega</span>
                <span>{formatBRL(decimalToNumber(order.deliveryFee))}</span>
              </div>
            )}
            <div className="linha" style={{ fontWeight: 700, fontSize: 14 }}>
              <span>TOTAL</span>
              <span>{formatBRL(decimalToNumber(order.total))}</span>
            </div>
            <div style={{ marginTop: '2mm' }}>Pagamento: {order.paymentMethod}</div>
            {order.paymentMethod === 'PIX' && store?.settings?.pixKey && (
              <div>PIX: {store.settings.pixKey}</div>
            )}
            <hr />
            <div className="centro">Obrigado pela preferência!</div>
          </>
        )}

        {/* Alimenta o papel antes do corte — sem isso a guilhotina come a última
            linha em boa parte das impressoras. */}
        <div style={{ height: '10mm' }} />
      </div>
    </>
  )
}
