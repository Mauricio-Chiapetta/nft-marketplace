import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import arrowDown from '@/assets/icons/arrow-down.svg'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NftSort } from '@/types/api'
import { nftListQuery } from '../queries'
import { PAGE_SIZE, SORT_LABELS, effectiveSort, toListParams } from '../search'
import { useCatalogSearch } from '../use-catalog-search'
import { CatalogPagination } from './catalog-pagination'
import { CatalogSidebar } from './catalog-sidebar'
import { NftCard, NftCardSkeleton } from './nft-card'

const TABS = ['Todos os NFTs', 'Novos lançamentos', 'Em alta']

export function CatalogProducts() {
  const { search, setFilter, setPage, reset } = useCatalogSearch()
  const list = useQuery({ ...nftListQuery(toListParams(search)), placeholderData: keepPreviousData })
  const sort = effectiveSort(search)
  const page = search.page ?? 1

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
            <SortMenu value={sort} onChange={(value) => setFilter({ sort: value })} />
          </div>

          <p className="sr-only" aria-live="polite">
            {list.data ? `${list.data.total} NFTs encontrados, página ${list.data.page} de ${Math.max(list.data.totalPages, 1)}.` : ''}
          </p>

          {list.isError && !list.data ? (
            <div role="alert" className="flex flex-col items-start gap-3 bg-surface-card p-6">
              <p className="text-foreground">Não foi possível carregar os NFTs.</p>
              <button type="button" onClick={() => list.refetch()} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink">
                Tentar novamente
              </button>
            </div>
          ) : list.data && list.data.items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 bg-surface-card p-6">
              <p className="text-foreground">Nenhum NFT encontrado com esses critérios.</p>
              <button type="button" onClick={reset} className="text-sm text-text-accent underline-offset-4 hover:underline">
                Limpar filtros
              </button>
            </div>
          ) : (
            <div
              aria-busy={list.isFetching}
              className={cn(
                'grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity sm:grid-cols-3 lg:gap-x-[34px] lg:gap-y-[72px]',
                list.isPlaceholderData && 'opacity-60',
              )}
            >
              {list.data
                ? list.data.items.map((nft) => <NftCard key={nft.id} nft={nft} />)
                : Array.from({ length: PAGE_SIZE }, (_, i) => <NftCardSkeleton key={i} />)}
            </div>
          )}
        </div>

        {list.data && list.data.totalPages > 1 && (
          <CatalogPagination page={page} totalPages={list.data.totalPages} onChange={setPage} />
        )}
      </div>
    </section>
  )
}

function SortMenu({ value, onChange }: { value: NftSort; onChange: (value: NftSort) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-sm text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Ordenar por: <span>{SORT_LABELS[value]}</span>
        <img src={arrowDown} alt="" width={10.83} height={6.17} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as NftSort)}>
          {(Object.keys(SORT_LABELS) as NftSort[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {SORT_LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
