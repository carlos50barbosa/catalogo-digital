'use client'

import { useActionState, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ImagePlus, AlertCircle, Camera, Loader2 } from 'lucide-react'
import { createProductAction, updateProductAction } from '@/app/painel/_actions/products'
import { initialActionState } from '@/lib/action-state'
import { CatalogPicker } from './CatalogPicker'
import { ProductImage } from '@/components/ui/product-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label, FieldError } from '@/components/ui/label'
import type { Unit, SerializedCatalogItem } from '@/lib/types'

const UNITS: { value: Unit; label: string }[] = [
  { value: 'UN', label: 'Unidade (un)' },
  { value: 'KG', label: 'Quilo (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'PCT', label: 'Pacote (pct)' },
]

export type ProductFormInitial = {
  id?: string
  name?: string
  description?: string | null
  price?: number
  unit?: Unit
  categoryId?: string | null
  catalogItemId?: string | null
  imageUrl?: string | null
  isAvailable?: boolean
}

export function ProductForm({
  mode,
  categories,
  initial,
}: {
  mode: 'create' | 'edit'
  categories: { id: string; name: string }[]
  initial?: ProductFormInitial
}) {
  const action = mode === 'create' ? createProductAction : updateProductAction
  const [state, formAction, pending] = useActionState(action, initialActionState)

  const [name, setName] = useState(initial?.name ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'UN')
  const [catalogItemId, setCatalogItemId] = useState(initial?.catalogItemId ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const realInputRef = useRef<HTMLInputElement>(null)

  // Comprime/redimensiona no cliente antes do upload (storage é o disco da VPS).
  async function handleFile(file: File | undefined) {
    if (!file) return
    setCompressing(true)
    try {
      const imageCompression = (await import('browser-image-compression')).default
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1200,
        maxSizeMB: 1,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      })
      const base = (file.name.replace(/\.[^.]+$/, '') || 'foto').slice(0, 40)
      const finalFile = new File([compressed], `${base}.jpg`, { type: 'image/jpeg' })
      if (realInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(finalFile)
        realInputRef.current.files = dt.files
      }
      setFilePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(finalFile)
      })
    } catch {
      // se a compressão falhar, envia o original
      if (realInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(file)
        realInputRef.current.files = dt.files
      }
      setFilePreview(URL.createObjectURL(file))
    } finally {
      setCompressing(false)
    }
  }

  function pickFromCatalog(item: SerializedCatalogItem) {
    setName(item.name + (item.brand ? ` ${item.brand}` : ''))
    setCatalogItemId(item.id)
    setImageUrl(item.defaultImageUrl ?? '')
    setFilePreview(null)
    // tenta casar a categoria sugerida com uma categoria existente
    if (item.suggestedCategory) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === item.suggestedCategory!.toLowerCase(),
      )
      if (match) setCategoryId(match.id)
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/painel/produtos"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-display text-2xl font-bold text-neutral-900">
        {mode === 'create' ? 'Novo produto' : 'Editar produto'}
      </h1>

      {mode === 'create' && <CatalogPicker onSelect={pickFromCatalog} />}

      <form action={formAction} className="space-y-4">
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="catalogItemId" value={catalogItemId} />
        <input type="hidden" name="imageUrl" value={imageUrl} />

        {state.error && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </p>
        )}

        {/* Imagem (câmera do celular ou galeria; comprimida no cliente) */}
        <div>
          <Label>Foto do produto</Label>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200">
              {filePreview ? (
                <Image src={filePreview} alt="Pré-visualização" fill className="object-cover" sizes="80px" unoptimized />
              ) : (
                <ProductImage src={imageUrl || null} alt={name || 'produto'} className="h-full w-full" iconClassName="h-6 w-6" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  <Camera className="h-4 w-4" />
                  Tirar foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  <ImagePlus className="h-4 w-4" />
                  Galeria
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
              </div>
              {compressing && (
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Otimizando imagem...
                </span>
              )}
            </div>
          </div>
          {/* input REAL enviado no FormData (recebe o arquivo já comprimido) */}
          <input type="file" name="image" ref={realInputRef} accept="image/*" className="hidden" tabIndex={-1} />
          <p className="mt-1 text-xs text-neutral-400">
            Tire uma foto na hora ou escolha da galeria — a imagem é otimizada automaticamente.
          </p>
        </div>

        {/* Nome */}
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Arroz Branco 5kg"
            required
          />
          <FieldError message={state.fieldErrors?.name} />
        </div>

        {/* Preço + Unidade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.price ?? ''}
              placeholder="0,00"
              required
            />
            <FieldError message={state.fieldErrors?.price} />
          </div>
          <div>
            <Label htmlFor="unit">Unidade</Label>
            <Select id="unit" name="unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <Select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {categories.length === 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              Nenhuma categoria ainda — você pode criar em “Categorias”.
            </p>
          )}
        </div>

        {/* Descrição */}
        <div>
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial?.description ?? ''}
            placeholder="Detalhes do produto..."
          />
        </div>

        {/* Disponibilidade */}
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="isAvailable"
            defaultChecked={initial?.isAvailable ?? true}
            className="h-4 w-4 rounded border-neutral-300 accent-[var(--accent)]"
          />
          Produto disponível para venda
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={pending} size="lg">
            {mode === 'create' ? 'Adicionar produto' : 'Salvar alterações'}
          </Button>
          <Link href="/painel/produtos">
            <Button type="button" variant="outline" size="lg">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
