'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Info,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ProductImage } from '@/components/ui/product-image'
import { analyzeNfeAction, confirmNfeImportAction } from '@/app/painel/_actions/nfe'
import { formatQty } from '@/lib/format'
import type { NfeMatchStatus, NfeReviewItem, Unit } from '@/lib/types'

const UNITS: { value: Unit; label: string }[] = [
  { value: 'UN', label: 'Unidade (un)' },
  { value: 'KG', label: 'Quilo (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'PCT', label: 'Pacote (pct)' },
]

const STATUS_META: Record<NfeMatchStatus, { label: string; className: string; hint: string }> = {
  UPDATE: {
    label: 'Atualizar',
    className: 'bg-blue-100 text-blue-700',
    hint: 'Já existe na sua loja — vamos só atualizar o custo.',
  },
  LIBRARY: {
    label: 'Da biblioteca',
    className: 'bg-green-100 text-green-700',
    hint: 'Encontrado na biblioteca — entra com nome e foto prontos.',
  },
  NEW: {
    label: 'Novo',
    className: 'bg-amber-100 text-amber-700',
    hint: 'Sem correspondência — confira o nome antes de salvar.',
  },
}

const DEFAULT_MARGIN = 30 // %

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

type Row = NfeReviewItem & {
  include: boolean
  origName: string
  origPrice: number | null
}

type Analysis = {
  accessKey: string
  supplierName: string | null
  supplierCnpj: string | null
  alreadyImportedAt: string | null
  maxProducts: number | null
  currentCount: number
}

export function NfeImport({ categories }: { categories: string[] }) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [margin, setMargin] = useState(DEFAULT_MARGIN)
  const [bulkCategory, setBulkCategory] = useState('')
  const [done, setDone] = useState<{ created: number; updated: number; skipped: number } | null>(
    null,
  )
  const [analyzing, startAnalyze] = useTransition()
  const [confirming, startConfirm] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Opções de categoria: existentes + sugeridas pela biblioteca (criadas ao confirmar).
  const categoryOptions = useMemo(() => {
    const set = new Map<string, string>() // lower -> nome exibido
    for (const c of categories) set.set(c.toLowerCase(), c)
    for (const r of rows) {
      const c = r.category?.trim()
      if (c) set.set(c.toLowerCase(), c)
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [categories, rows])

  const summary = useMemo(() => {
    let create = 0
    let update = 0
    let ignore = 0
    for (const r of rows) {
      if (!r.include) ignore++
      else if (r.status === 'UPDATE') update++
      else create++
    }
    return { create, update, ignore }
  }, [rows])

  const exceedsPlan =
    analysis?.maxProducts != null &&
    analysis.currentCount + summary.create > analysis.maxProducts
  const slotsLeft =
    analysis?.maxProducts != null
      ? Math.max(0, analysis.maxProducts - analysis.currentCount)
      : null

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setDone(null)
    const isXml =
      file.name.toLowerCase().endsWith('.xml') ||
      file.type === 'text/xml' ||
      file.type === 'application/xml'
    if (!isXml) {
      setError('Envie o arquivo XML da NF-e (com extensão .xml).')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Arquivo muito grande para uma NF-e.')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      startAnalyze(async () => {
        const res = await analyzeNfeAction(text)
        if (!res.ok) {
          setError(res.error)
          return
        }
        setAnalysis({
          accessKey: res.accessKey,
          supplierName: res.supplierName,
          supplierCnpj: res.supplierCnpj,
          alreadyImportedAt: res.alreadyImportedAt,
          maxProducts: res.plan.maxProducts,
          currentCount: res.plan.currentCount,
        })
        setRows(
          res.items.map((i) => ({
            ...i,
            include: true,
            origName: i.name,
            origPrice: i.price,
          })),
        )
        setStep('review')
      })
    }
    reader.onerror = () => setError('Não foi possível ler o arquivo.')
    reader.readAsText(file)
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function toggleAll(include: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, include })))
  }

  function applyMarginToSelected() {
    setRows((prev) =>
      prev.map((r) =>
        r.include && r.cost != null
          ? { ...r, price: round2(r.cost * (1 + margin / 100)) }
          : r,
      ),
    )
  }

  function suggestPrice(key: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.cost != null
          ? { ...r, price: round2(r.cost * (1 + margin / 100)) }
          : r,
      ),
    )
  }

  function setCategoryForSelected(name: string) {
    setBulkCategory(name)
    // Itens "Atualizar" mantêm a categoria atual do produto — não mexemos nela.
    setRows((prev) =>
      prev.map((r) =>
        r.include && r.status !== 'UPDATE' ? { ...r, category: name || null } : r,
      ),
    )
  }

  function reset() {
    setStep('upload')
    setRows([])
    setAnalysis(null)
    setFileName('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function confirm() {
    if (!analysis) return
    const included = rows.filter((r) => r.include)
    if (included.length === 0) {
      setError('Selecione ao menos um item para importar.')
      return
    }
    setError(null)
    const payload = {
      accessKey: analysis.accessKey,
      supplierName: analysis.supplierName,
      supplierCnpj: analysis.supplierCnpj,
      items: included.map((r) => ({
        status: r.status,
        include: true,
        name: r.name.trim(),
        barcode: r.barcode,
        cost: r.cost,
        price: r.price,
        unit: r.unit,
        category: r.category,
        productId: r.productId,
        catalogItemId: r.catalogItemId,
        updateName: r.status === 'UPDATE' ? r.name.trim() !== r.origName : undefined,
        updatePrice: r.status === 'UPDATE' ? r.price !== r.origPrice : undefined,
      })),
    }
    const skipped = rows.length - included.length
    startConfirm(async () => {
      const res = await confirmNfeImportAction(payload)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setDone({ created: res.created, updated: res.updated, skipped })
      setStep('upload')
      setRows([])
      setAnalysis(null)
      setFileName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  // ---------- Tela de sucesso ----------
  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="flex items-center gap-2 font-medium text-green-700">
            <CheckCircle2 className="h-5 w-5" /> Importação concluída!
          </p>
          <p className="mt-1 text-sm text-green-700">
            {done.created} produto(s) criado(s) · {done.updated} atualizado(s)
            {done.skipped > 0 ? ` · ${done.skipped} ignorado(s)` : ''}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/painel/produtos">
              <Button size="sm">Ver produtos</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setDone(null)}>
              Importar outra nota
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Etapa 1: upload ----------
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
          <p className="text-sm text-neutral-600">
            Envie o <strong>XML da NF-e de compra</strong> — aquela nota que o fornecedor manda
            por e-mail ou você baixa no portal. Vamos casar os itens pelo código de barras com a
            sua loja e com a biblioteca, e mostrar tudo para você revisar{' '}
            <strong>antes de salvar</strong>.
          </p>
          <div className="mt-3">
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {analyzing ? 'Lendo a nota...' : 'Escolher arquivo XML'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                className="hidden"
                onChange={onFile}
                disabled={analyzing}
              />
            </label>
          </div>
          {fileName && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
              <FileText className="h-4 w-4" /> {fileName}
            </p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            O custo da nota é o que você pagou — não é o preço de venda. Você define o preço na
            revisão (ou deixa para precificar depois).
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4" /> {error}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ---------- Etapa 4: revisão ----------
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Trocar de nota
      </button>

      {/* Fornecedor + dedup */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <p className="text-sm font-medium text-neutral-900">
          {analysis?.supplierName ?? 'Fornecedor não identificado'}
        </p>
        {analysis?.supplierCnpj && (
          <p className="text-xs text-neutral-500">CNPJ {analysis.supplierCnpj}</p>
        )}
        {analysis?.alreadyImportedAt && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Esta nota já foi importada em {analysis.alreadyImportedAt}. Importar de novo é
            bloqueado para evitar duplicar produtos.
          </p>
        )}
      </div>

      {/* Resumo + limite de plano */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <p className="text-sm text-neutral-700">
          <strong>{summary.create}</strong> serão criados ·{' '}
          <strong>{summary.update}</strong> atualizados · <strong>{summary.ignore}</strong>{' '}
          ignorados
        </p>
        {exceedsPlan && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Seu plano permite até {analysis?.maxProducts} produtos e você já tem{' '}
              {analysis?.currentCount}. Dá para criar mais {slotsLeft}.
            </p>
            <p className="mt-1">
              Desmarque alguns itens para caber ou{' '}
              <Link href="/painel/assinatura" className="font-semibold underline">
                mude de plano
              </Link>{' '}
              para liberar mais.
            </p>
          </div>
        )}
      </div>

      {/* Ações em massa */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>
            Marcar todos
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleAll(false)}>
            Desmarcar todos
          </Button>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Categoria dos selecionados
          </label>
          <Select
            value={bulkCategory}
            onChange={(e) => setCategoryForSelected(e.target.value)}
            className="h-10"
          >
            <option value="">Sem categoria</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Margem (%)</label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="1"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value) || 0)}
              className="h-10 w-20"
            />
            <Button size="sm" variant="outline" onClick={applyMarginToSelected}>
              <Sparkles className="h-4 w-4" /> Aplicar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de itens (cartões — responsivo) */}
      <ul className="space-y-3">
        {rows.map((r) => {
          const meta = STATUS_META[r.status]
          return (
            <li
              key={r.key}
              className={`rounded-2xl border bg-white p-4 shadow-card transition ${
                r.include ? 'border-neutral-200' : 'border-neutral-200 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <label className="mt-1 flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => patchRow(r.key, { include: e.target.checked })}
                    className="h-5 w-5 rounded border-neutral-300 accent-[var(--accent)]"
                    aria-label={`Incluir ${r.name}`}
                  />
                </label>

                <ProductImage
                  src={r.imageUrl}
                  alt={r.name}
                  className="h-14 w-14 shrink-0 rounded-xl"
                  iconClassName="h-5 w-5"
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {formatQty(r.qCom)} {r.uCom}
                      {r.barcode ? ` · GTIN ${r.barcode}` : ' · sem código de barras'}
                    </span>
                  </div>

                  {/* Nome */}
                  <Input
                    value={r.name}
                    onChange={(e) => patchRow(r.key, { name: e.target.value })}
                    placeholder="Nome do produto"
                    aria-label="Nome do produto"
                  />

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {/* Custo */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                        Custo (R$)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.cost ?? ''}
                        onChange={(e) =>
                          patchRow(r.key, {
                            cost: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="h-10"
                      />
                    </div>
                    {/* Preço */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                        Preço (R$)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.price ?? ''}
                        placeholder="—"
                        onChange={(e) =>
                          patchRow(r.key, {
                            price: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="h-10"
                      />
                    </div>
                    {/* Unidade */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                        Unidade
                      </label>
                      <Select
                        value={r.unit}
                        onChange={(e) => patchRow(r.key, { unit: e.target.value as Unit })}
                        disabled={r.status === 'UPDATE'}
                        className="h-10 disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {/* Categoria */}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                        Categoria
                      </label>
                      <Select
                        value={r.category ?? ''}
                        onChange={(e) => patchRow(r.key, { category: e.target.value || null })}
                        disabled={r.status === 'UPDATE'}
                        className="h-10 disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        <option value="">Sem categoria</option>
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-neutral-400">{meta.hint}</p>
                    {r.cost != null && (
                      <button
                        type="button"
                        onClick={() => suggestPrice(r.key)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Sugerir preço (+{margin}%)
                      </button>
                    )}
                  </div>
                  {r.include && r.status !== 'UPDATE' && r.price == null && (
                    <p className="text-[11px] text-amber-700">
                      Sem preço — entra como <strong>indisponível</strong> até você precificar.
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        </div>
      )}

      {/* Barra de confirmação */}
      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card lg:bottom-4">
        <p className="text-sm text-neutral-600">
          {summary.create + summary.update} item(ns) selecionado(s)
        </p>
        <Button
          onClick={confirm}
          loading={confirming}
          disabled={
            confirming ||
            !!analysis?.alreadyImportedAt ||
            exceedsPlan ||
            summary.create + summary.update === 0
          }
        >
          Confirmar importação
        </Button>
      </div>
    </div>
  )
}
