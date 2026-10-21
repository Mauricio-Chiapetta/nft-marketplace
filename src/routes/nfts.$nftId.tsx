import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { NftDescription, NftDetail, NftDetailSkeleton } from '@/features/catalog/components/nft-detail'
import { RelatedNfts } from '@/features/catalog/components/related-nfts'
import { nftDetailQuery } from '@/features/catalog/queries'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(nftDetailQuery(nftId))

  if (nft.isPending) return <NftDetailSkeleton />

  if (nft.isError) {
    const notFound = isAxiosError(nft.error) && nft.error.response?.status === 404
    return (
      <div role="alert" className="flex flex-col items-start gap-4 py-16">
        <h1 className="text-[28px] font-bold text-foreground">
          {notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}
        </h1>
        <p className="text-text-secondary">
          {notFound ? 'Ele pode ter sido removido ou o link está incorreto.' : 'Verifique sua conexão e tente novamente.'}
        </p>
        <div className="flex gap-2">
          {!notFound && (
            <button
              type="button"
              onClick={() => nft.refetch()}
              className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-ink"
            >
              Tentar novamente
            </button>
          )}
          <Link to="/" hash="produtos" className="flex h-10 items-center rounded-md border border-primary px-4 text-sm text-text-accent">
            Voltar ao mercado
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-16 pb-16 max-md:pb-12 lg:gap-24 lg:pb-24">
      <NftDetail key={nft.data.id} nft={nft.data} />
      <NftDescription nft={nft.data} />
      <RelatedNfts nft={nft.data} />
    </div>
  )
}
