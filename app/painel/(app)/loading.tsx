// Skeleton genérico do conteúdo do painel (dentro do AdminShell) enquanto a
// página carrega. Título + cards de indicadores + um bloco de conteúdo.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200" />
            <div className="mt-3 h-6 w-20 animate-pulse rounded bg-neutral-200" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-neutral-200" />
          </div>
        ))}
      </div>

      <div className="h-40 w-full animate-pulse rounded-2xl bg-neutral-100" />
    </div>
  )
}
