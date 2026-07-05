// Skeleton do painel da plataforma: título + cards de indicadores + lista de lojas.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-neutral-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200" />
            <div className="mt-2 h-5 w-16 animate-pulse rounded bg-neutral-200" />
            <div className="mt-1 h-3 w-12 animate-pulse rounded bg-neutral-200" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    </div>
  )
}
