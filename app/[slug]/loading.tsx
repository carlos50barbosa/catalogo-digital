// Skeleton da vitrine enquanto os dados da loja carregam (rota force-dynamic).
export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-neutral-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="h-11 w-11 animate-pulse rounded-xl bg-neutral-200" />
          </div>
          <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-neutral-200" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="aspect-square w-full animate-pulse bg-neutral-200" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-14 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
                <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
