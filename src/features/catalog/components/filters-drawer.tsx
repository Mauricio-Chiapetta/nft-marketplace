import type { ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { CatalogFilters } from './catalog-sidebar'

/** Filtros em painel inferior abaixo de lg (no desktop ficam na sidebar). */
export function FiltersDrawer({ trigger }: { trigger: ReactNode }) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/70 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[20px] bg-surface-card outline-none data-open:animate-in data-open:slide-in-from-bottom md:inset-x-auto md:right-0 md:top-0 md:max-h-none md:w-[360px] md:rounded-none md:data-open:slide-in-from-right"
        >
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <DialogPrimitive.Title className="text-lg font-bold text-foreground">Filtros</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Fechar filtros" className="grid size-8 place-items-center text-text-secondary">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </header>
          <div className="flex-1 overflow-y-auto">
            <CatalogFilters />
          </div>
          <footer className="border-t border-border p-4">
            <DialogPrimitive.Close className="h-11 w-full rounded-[10px] bg-primary text-base font-bold text-ink">
              Ver resultados
            </DialogPrimitive.Close>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
