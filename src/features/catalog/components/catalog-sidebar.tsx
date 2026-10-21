import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftCategory } from '@/types/api'
import { facetsQuery } from '../queries'
import { parseCategories } from '../search'
import { useCatalogSearch } from '../use-catalog-search'
import { PriceRange } from './price-range'

export function CatalogSidebar() {
  return (
    <aside className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
      <CatalogFilters />
      <FeaturedBanner />
    </aside>
  )
}

export function CatalogFilters() {
  const facets = useQuery(facetsQuery())
  const { search, setFilter } = useCatalogSearch()
  const selected = parseCategories(search.category)
  const hasFilters = selected.length > 0 || search.min || search.max

  function toggle(category: NftCategory) {
    const next = selected.includes(category) ? selected.filter((c) => c !== category) : [...selected, category]
    setFilter({ category: next.join(',') || undefined })
  }

  return (
    <div className="flex flex-col gap-10 bg-surface-card p-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 flex w-full items-baseline justify-between text-lg font-bold leading-4 text-foreground">
          Coleções
          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilter({ category: undefined, min: undefined, max: undefined })}
              className="text-sm font-normal text-text-accent underline-offset-4 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </legend>
        <ul className="px-3 text-[15px] leading-10">
          {facets.isPending
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex h-10 items-center">
                  <Skeleton className="h-3.5 w-full bg-surface-dark" />
                </li>
              ))
            : facets.data?.categories.map((c) => {
                const checked = selected.includes(c.value)
                return (
                  <li key={c.value}>
                    <label
                      className={cn(
                        'flex cursor-pointer justify-between hover:text-text-accent',
                        checked ? 'text-text-accent' : 'text-text-secondary',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(c.value)}
                          className="size-3.5 accent-primary"
                        />
                        {c.label}
                      </span>
                      <span className="font-bold">({c.count})</span>
                    </label>
                  </li>
                )
              })}
        </ul>
      </fieldset>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold leading-4 text-foreground">Faixa de preço</h2>
        {facets.data ? (
          <PriceRange
            key={`${search.min}-${search.max}`}
            bounds={facets.data.priceRange}
            min={search.min}
            max={search.max}
            onApply={(range) => setFilter(range)}
          />
        ) : (
          <Skeleton className="ml-3 h-20 bg-surface-dark" />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold leading-4 text-foreground">Rede</h2>
        {/* O catálogo do mock é todo na Ethereum; filtro por rede fica fora do escopo. */}
        <ul className="pl-3 text-[15px] leading-10 text-text-secondary" aria-disabled="true" title="Em breve">
          <li>Ethereum</li>
          <li className="opacity-60">Polygon</li>
          <li className="opacity-60">Arbitrum</li>
        </ul>
      </section>
    </div>
  )
}

function FeaturedBanner() {
  return (
    <div className="relative hidden h-[470px] overflow-hidden bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1 lg:block">
      <div className="flex flex-col gap-4">
        <p className="px-5 text-2xl font-bold leading-8 text-text-accent">NFT EM DESTAQUE</p>
        <p className="px-5 text-center text-[22px] font-bold leading-4 text-foreground">OFERTA LIMITADA</p>
        <img
          src="/nfts/jungle-4-480.webp"
          alt=""
          width={310}
          height={368}
          loading="lazy"
          className="h-[368px] w-full rounded-[22px] object-cover"
        />
      </div>
      <span className="absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20" />
      <span className="absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-[linear-gradient(145deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]" />
      <span className="absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-[linear-gradient(145deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]" />
    </div>
  )
}
