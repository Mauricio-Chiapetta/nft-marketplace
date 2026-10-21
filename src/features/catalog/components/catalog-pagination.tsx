import { cn } from 'cn'
import chevronRight from '@/assets/icons/chevron-right.svg'

const WINDOW = 4

/** Janela de até 4 páginas em volta da atual, como no Figma (1 2 3 4 >). */
function pageWindow(page: number, total: number) {
  const start = Math.max(1, Math.min(page - 1, total - WINDOW + 1))
  return Array.from({ length: Math.min(WINDOW, total) }, (_, i) => start + i)
}

export function CatalogPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  const box = 'grid size-[35px] place-items-center rounded-[4px] text-lg leading-4'
  return (
    <nav aria-label="Paginação" className="flex items-center gap-2">
      {page > 1 && (
        <button type="button" aria-label="Página anterior" onClick={() => onChange(page - 1)} className={cn(box, 'border border-border')}>
          <img src={chevronRight} alt="" width={12} height={6.75} className="rotate-90" />
        </button>
      )}
      {pageWindow(page, totalPages).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Página ${n}`}
          aria-current={n === page ? 'page' : undefined}
          className={cn(box, n === page ? 'bg-primary font-bold text-ink' : 'border border-border text-foreground hover:border-primary')}
        >
          {n}
        </button>
      ))}
      {page < totalPages && (
        <button type="button" aria-label="Próxima página" onClick={() => onChange(page + 1)} className={cn(box, 'border border-border hover:border-primary')}>
          <img src={chevronRight} alt="" width={12} height={6.75} className="-rotate-90" />
        </button>
      )}
    </nav>
  )
}
