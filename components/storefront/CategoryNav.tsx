import { cn } from '@/lib/utils'
import type { SerializedCategory } from '@/lib/types'

/** Abas/chips de categoria roláveis horizontalmente (mobile-first). */
export function CategoryNav({
  categories,
  active,
  onSelect,
}: {
  categories: SerializedCategory[]
  active: string
  onSelect: (id: string) => void
}) {
  const chips = [{ id: 'all', name: 'Todos' }, ...categories]
  return (
    <nav
      aria-label="Categorias"
      className="no-scrollbar sticky top-[136px] z-20 -mx-4 overflow-x-auto border-b border-neutral-200 bg-neutral-50/95 px-4 py-2 backdrop-blur"
    >
      <ul className="flex gap-2">
        {chips.map((c) => {
          const isActive = active === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-pressed={isActive}
                className={cn(
                  'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-accent text-accent-fg'
                    : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100',
                )}
              >
                {c.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
