import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import arrowDown from '@/assets/icons/arrow-down.svg'
import chevronRight from '@/assets/icons/chevron-right.svg'
import { nftListQuery } from '../queries'
import { CatalogSidebar } from './catalog-sidebar'
import { NftCard, NftCardSkeleton } from './nft-card'

const PAGE_SIZE = 9
const TABS = ['Todos os NFTs', 'Novos lançamentos', 'Em alta']

// Layout do Figma. Busca, filtros, ordenação e paginação na URL entram na fase 3.
export function CatalogProducts() {
  const list = useQuery(nftListQuery({ page: 1, pageSize: PAGE_SIZE }))

  return (
    <section id="produtos" className="flex scroll-mt-6 flex-col gap-12 lg:flex-row">
      <div className="order-2 lg:order-1">
        <CatalogSidebar />
      </div>

      <div className="order-1 flex min-w-0 flex-1 flex-col items-end gap-[88px] lg:order-2">
        <div className="flex w-full flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div role="tablist" aria-label="Visualização" className="-mx-1 flex max-w-full gap-5 overflow-x-auto px-1 pb-2 text-sm font-medium leading-4 sm:text-[15px]">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={i === 0}
                  className={cn(
                    'relative whitespace-nowrap',
                    i === 0
                      ? 'text-text-accent after:absolute after:top-[23px] after:left-0 after:h-0.5 after:w-[101px] after:bg-primary'
                      : 'text-foreground',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button type="button" className="flex items-center gap-2 text-[15px] text-foreground">
              Ordenar por: <span>Listados recentemente</span>
              <img src={arrowDown} alt="" width={10.83} height={6.17} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-[34px] lg:gap-y-[72px]">
            {list.isPending
              ? Array.from({ length: PAGE_SIZE }, (_, i) => <NftCardSkeleton key={i} />)
              : list.data?.items.map((nft) => <NftCard key={nft.id} nft={nft} />)}
          </div>
          {list.isError && (
            <p role="alert" className="text-text-secondary">
              Não foi possível carregar os NFTs.
            </p>
          )}
        </div>

        {list.data && list.data.totalPages > 1 && (
          <nav aria-label="Paginação" className="flex items-center gap-2">
            {Array.from({ length: Math.min(list.data.totalPages, 4) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === list.data.page ? 'page' : undefined}
                className={cn(
                  'grid size-[35px] place-items-center rounded-[4px] text-lg leading-4',
                  n === list.data.page ? 'bg-primary font-bold text-ink' : 'border border-border text-foreground',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              aria-label="Próxima página"
              className="grid size-[35px] place-items-center rounded-[4px] border border-border"
            >
              <img src={chevronRight} alt="" width={12} height={6.75} className="-rotate-90" />
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}
