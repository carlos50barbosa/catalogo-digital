import { requireStore } from '@/lib/auth-helpers'
import { CsvImport } from '@/components/admin/CsvImport'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  await requireStore()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Importar produtos</h1>
        <p className="text-sm text-neutral-500">Suba vários produtos de uma vez por planilha CSV.</p>
      </div>
      <CsvImport />
    </div>
  )
}
