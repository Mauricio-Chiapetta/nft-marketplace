import { useQuery } from '@tanstack/react-query'
import type { Nft } from '@/types/api'
import { nftListQuery } from '../queries'
import { NftCard, NftCardSkeleton } from './nft-card'

const VISIBLE = 5

export function RelatedNfts({ nft }: { nft: Nft }) {
  const related = useQuery({
    ...nftListQuery({ collection: [nft.collection.id], pageSize: VISIBLE + 1 }),
    select: (page) => page.items.filter((item) => item.id !== nft.id).slice(0, VISIBLE),
  })

  if (related.data?.length === 0) return null

  return (
    <section className="flex flex-col gap-8">
      <h2 className="border-b-[0.3px] border-primary pb-3 text-[17px] font-bold leading-4 text-text-accent">
        Mais desta coleção
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-[26px]">
        {related.isPending
          ? Array.from({ length: VISIBLE }, (_, i) => <NftCardSkeleton key={i} />)
          : related.data?.map((item) => <NftCard key={item.id} nft={item} />)}
      </div>
    </section>
  )
}
