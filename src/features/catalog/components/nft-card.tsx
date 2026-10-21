import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import type { Nft } from '@/types/api'

export function NftCard({ nft }: { nft: Nft }) {
  const image = nft.images[0]
  const soldOut = nft.totalAvailable === 0
  return (
    <Link
      to="/nfts/$nftId"
      params={{ nftId: nft.id }}
      className="group flex flex-col gap-3 rounded-sm outline-offset-4"
    >
      <div className="relative bg-surface-card px-1 pt-6 pb-7">
        <img
          src={image.thumb}
          alt={image.alt}
          width={250}
          height={250}
          loading="lazy"
          className="aspect-square w-full rounded-[15px] object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        {soldOut && (
          <span className="absolute top-2 right-2 rounded-sm bg-ink/80 px-2 py-0.5 text-xs font-bold text-text-secondary">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="truncate text-base/4 text-foreground">{nft.name}</p>
        <p className="text-lg/4 font-bold text-text-accent">{formatEth(nft.priceFromEth)}</p>
      </div>
    </Link>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="bg-surface-card px-1 pt-6 pb-7">
        <Skeleton className="aspect-square w-full rounded-[15px] bg-surface-dark" />
      </div>
      {/* Mesmas alturas do texto real (2 linhas de 16px, gap 6px) para não deslocar o layout. */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/5 bg-surface-card" />
        <Skeleton className="h-4 w-2/5 bg-surface-card" />
      </div>
    </div>
  )
}
