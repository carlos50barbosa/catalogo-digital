import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStore } from '@/lib/auth-helpers'
import { listCategories } from '@/lib/data/categories'
import { NfeImport } from '@/components/admin/NfeImport'

export const dynamic = 'force-dynamic'

export default async function ImportNfePage() {
  const { storeId } = await requireStore()
  const categories = await listCategories(storeId)

  return (
    <div className="space-y-5">
      <Link
        href="/painel/importar"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para importar
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          Importar da nota fiscal (XML)
        </h1>
        <p className="text-sm text-neutral-500">
          Suba o XML da NF-e do fornecedor — casamos os itens pelo código de barras e você revisa
          antes de salvar.
        </p>
      </div>
      <NfeImport categories={categories.map((c) => c.name)} />
    </div>
  )
}
