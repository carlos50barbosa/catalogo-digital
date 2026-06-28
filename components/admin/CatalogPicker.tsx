'use client'

import { useEffect, useState, useTransition } from 'react'
import { Search, Library, Loader2 } from 'lucide-react'
import { ProductImage } from '@/components/ui/product-image'
import { searchCatalogAction } from '@/app/painel/_actions/catalog'
import type { SerializedCatalogItem } from '@/lib/types'

/**
 * Seletor da BIBLIOTECA COMPARTILHADA. Ao escolher um item, o produto herda
 * nome e imagem por padrão (o preço é sempre definido pela loja).
 */
export function CatalogPicker({
  onSelect,
}: {
  onSelect: (item: SerializedCatalogItem) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SerializedCatalogItem[]>([])
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function run(q: string) {
    startTransition(async () => {
      setResults(await searchCatalogAction(q))
    })
  }

  // Carrega uma primeira leva ao abrir.
  useEffect(() => {
    if (open && results.length === 0) run('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
        <Library className="h-4 w-4 text-green-600" />
        Escolher da biblioteca compartilhada
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        {pending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
        )}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            run(e.target.value)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar produto na biblioteca (ex.: arroz, refrigerante...)"
          aria-label="Buscar na biblioteca"
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-9 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {open && (
        <ul className="mt-2 max-h-64 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
          {results.length === 0 && !pending ? (
            <li className="px-3 py-4 text-center text-sm text-neutral-400">
              Nenhum item encontrado.
            </li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50"
                >
                  <ProductImage
                    src={item.defaultImageUrl}
                    alt={item.name}
                    className="h-10 w-10 shrink-0 rounded-lg"
                    iconClassName="h-4 w-4"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {[item.brand, item.suggestedCategory].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      <p className="mt-2 text-xs text-neutral-400">
        Ou preencha os campos abaixo para um produto personalizado.
      </p>
    </div>
  )
}
