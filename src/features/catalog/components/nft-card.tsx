import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import type { Nft } from '@/types/api'

export function NftCard({ nft }: { nft: Nft }) {
  const image = nft.images[0]
  const soldOut = nft.totalAvailable === 0
  return (
    // O favorito fica fora do link (botão dentro de <a> não é válido).
    <div className="relative">
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="group flex flex-col gap-2 rounded-sm outline-offset-4 md:gap-3"
      >
        <div className="relative rounded-[20px] bg-[linear-gradient(139.5deg,#241612_12%,#2f1d15_106.6%)] px-1 pt-3 pb-5 md:rounded-none md:bg-surface-card md:bg-none md:pt-6 md:pb-7">
          <img
            src={image.thumb}
            alt={image.alt}
            width={250}
            height={250}
            loading="lazy"
            className="aspect-square w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none md:rounded-[15px]"
          />
          {soldOut && (
            <span className="absolute top-4 left-0 bg-primary px-2 py-2 text-[13px] font-medium leading-4 text-ink md:top-2 md:right-2 md:left-auto md:rounded-sm md:bg-ink/80 md:py-0.5 md:text-xs md:font-bold md:text-text-secondary">
              Esgotado
            </span>
          )}
        </div>
        <div className="flex flex-col pl-2 md:gap-1.5 md:pl-0">
          <p className="truncate text-[15px] text-foreground md:text-base/4">{nft.name}</p>
          <p className="text-base/4 font-bold text-text-accent md:text-lg/4">{formatEth(nft.priceFromEth)}</p>
        </div>
      </Link>
      <FavoriteButton variant="icon" nftId={nft.id} nftName={nft.name} className="absolute top-5 right-3 md:hidden" />
    </div>
  )
}

export function NftCardSkeleton() {
  // Mesma estrutura e alturas do card real em cada breakpoint, para não deslocar o layout.
  return (
    <div className="flex flex-col gap-2 md:gap-3" aria-hidden>
      <div className="rounded-[20px] bg-surface-card px-1 pt-3 pb-5 md:rounded-none md:pt-6 md:pb-7">
        <Skeleton className="aspect-square w-full rounded-2xl bg-surface-dark md:rounded-[15px]" />
      </div>
      <div className="flex flex-col pl-2 md:gap-1.5 md:pl-0">
        <div className="flex h-[22.5px] items-center md:h-4">
          <Skeleton className="h-4 w-3/5 bg-surface-card" />
        </div>
        <Skeleton className="h-4 w-2/5 bg-surface-card" />
      </div>
    </div>
  )
}
