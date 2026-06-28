'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Upload, FileText, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseProductsCsv, type ParsedProductRow, type CsvError } from '@/lib/csv'
import { importProductsAction } from '@/app/painel/_actions/import'
import { formatBRL, UNIT_LABELS } from '@/lib/format'

const SAMPLE = 'nome,categoria,preco,unidade\nArroz 5kg,Mercearia,27.90,UN\nBanana,Hortifruti,5.99,KG\n'

export function CsvImport() {
  const [rows, setRows] = useState<ParsedProductRow[]>([])
  const [errors, setErrors] = useState<CsvError[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<{ imported: number } | null>(null)
  const [pending, startTransition] = useTransition()

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseProductsCsv(text)
      setRows(parsed.rows)
      setErrors(parsed.errors)
    }
    reader.readAsText(file)
  }

  function doImport() {
    if (rows.length === 0) return
    startTransition(async () => {
      const res = await importProductsAction(
        rows.map((r) => ({ name: r.name, category: r.category, price: r.price, unit: r.unit })),
      )
      if (res.ok) {
        setResult({ imported: res.imported })
        setRows([])
        setErrors([])
        setFileName('')
      } else {
        setErrors([{ line: 0, message: res.error ?? 'Falha na importação.' }])
      }
    })
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-produtos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {result && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            {result.imported} produto(s) importado(s) com sucesso!
          </p>
          <Link href="/painel/produtos">
            <Button size="sm">Ver produtos</Button>
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
        <p className="text-sm text-neutral-600">
          Envie uma planilha CSV com as colunas <strong>nome, categoria, preco, unidade</strong>.
          As categorias inexistentes serão criadas automaticamente.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90">
            <Upload className="h-4 w-4" />
            Escolher arquivo CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
          <button
            type="button"
            onClick={downloadSample}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" /> Baixar modelo
          </button>
        </div>
        {fileName && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
            <FileText className="h-4 w-4" /> {fileName}
          </p>
        )}
      </div>

      {/* Relatório de erros */}
      {errors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" /> {errors.length} aviso(s)
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-amber-700">
            {errors.slice(0, 12).map((e, i) => (
              <li key={i}>
                {e.line > 0 ? `Linha ${e.line}: ` : ''}
                {e.message}
              </li>
            ))}
            {errors.length > 12 && <li>…e mais {errors.length - 12}.</li>}
          </ul>
        </div>
      )}

      {/* Prévia */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-neutral-100 p-4">
            <p className="text-sm font-medium text-neutral-700">
              Prévia — {rows.length} produto(s) prontos para importar
            </p>
            <Button onClick={doImport} loading={pending}>
              Importar {rows.length}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium">Unid.</th>
                  <th className="px-4 py-2 text-right font-medium">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-neutral-900">{r.name}</td>
                    <td className="px-4 py-2 text-neutral-500">{r.category || '—'}</td>
                    <td className="px-4 py-2 text-neutral-500">{UNIT_LABELS[r.unit]}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatBRL(r.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && (
              <p className="p-3 text-center text-xs text-neutral-400">
                Mostrando 50 de {rows.length}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
