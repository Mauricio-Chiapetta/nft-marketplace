import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import sliderThumb from '@/assets/icons/slider-thumb.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { facetsQuery } from '../queries'

// Filtros: layout do Figma. A interação (URL, aplicar faixa) entra na fase 3.
export function CatalogSidebar() {
  return (
    <aside className="flex w-full flex-col gap-6 lg:w-[310px] lg:shrink-0">
      <CatalogFilters />
      <FeaturedBanner />
    </aside>
  )
}

function CatalogFilters() {
  const facets = useQuery(facetsQuery())

  return (
    <div className="flex flex-col gap-10 bg-surface-card p-5">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold leading-4 text-foreground">Coleções</h2>
        <ul className="px-3 text-[15px] leading-10">
          {facets.isPending
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex h-10 items-center">
                  <Skeleton className="h-3.5 w-full bg-surface-dark" />
                </li>
              ))
            : facets.data?.categories.map((c, i) => (
                <li
                  key={c.value}
                  className={cn('flex justify-between', i === 0 ? 'text-text-accent' : 'text-text-secondary')}
                >
                  <span>{c.label}</span>
                  <span className="font-bold">({c.count})</span>
                </li>
              ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold leading-4 text-foreground">Faixa de preço</h2>
        <div className="flex flex-col gap-3 pl-3">
          <div className="relative flex h-[15px] items-center" aria-hidden>
            <span className="absolute inset-x-0 h-1 rounded-full bg-primary" />
            <img src={sliderThumb} alt="" width={21} height={21} className="relative -ml-[3px]" />
            <img src={sliderThumb} alt="" width={21} height={21} className="relative ml-[155px]" />
          </div>
          <p className="text-[15px] text-foreground">
            Preço:{' '}
            {facets.data
              ? `${formatEth(facets.data.priceRange.min).replace(' ETH', '')} - ${formatEth(facets.data.priceRange.max)}`
              : '…'}
          </p>
          <button
            type="button"
            className="self-start rounded-md bg-primary px-3 py-2 text-base font-bold leading-5 text-ink"
          >
            Aplicar
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold leading-4 text-foreground">Rede</h2>
        <ul className="pl-3 text-[15px] leading-10 text-text-secondary">
          <li>Ethereum</li>
          <li>Polygon</li>
          <li>Arbitrum</li>
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
