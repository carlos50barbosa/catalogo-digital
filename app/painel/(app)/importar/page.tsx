import Link from 'next/link'
import { FileSpreadsheet, ReceiptText, ChevronRight } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { CsvImport } from '@/components/admin/CsvImport'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  await requireStore()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Importar produtos</h1>
        <p className="text-sm text-neutral-500">
          Monte seu catálogo de uma vez — pela nota fiscal do fornecedor ou por planilha CSV.
        </p>
      </div>

      {/* Importar pela NF-e (XML) — casa itens pelo código de barras */}
      <Link
        href="/painel/importar/nfe"
        className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card transition hover:border-accent hover:shadow-md"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <ReceiptText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-neutral-900">Importar da nota fiscal (XML)</p>
          <p className="text-sm text-neutral-500">
            Suba o XML da NF-e de compra: casamos os itens pelo código de barras com a sua loja e
            com a biblioteca, e você revisa antes de salvar.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
      </Link>

      {/* Importar por CSV */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-neutral-900">Importar por planilha (CSV)</p>
            <p className="text-sm text-neutral-500">Suba vários produtos de uma vez por CSV.</p>
          </div>
        </div>
        <CsvImport />
      </div>
    </div>
  )
}
