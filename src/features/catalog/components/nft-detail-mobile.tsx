import { useRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { Heart } from 'lucide-react'
import arrowLeft from '@/assets/icons/mobile/arrow-left.svg'
import minusIcon from '@/assets/icons/mobile/minus-sm.svg'
import plusIcon from '@/assets/icons/mobile/plus-sm.svg'
import shopIcon from '@/assets/icons/mobile/shop-dark.svg'
import { formatEth } from '@/lib/eth'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import type { Nft, NftEdition } from '@/types/api'

export interface PurchaseState {
  imageIndex: number
  setImageIndex: (i: number) => void
  edition: NftEdition
  selectEdition: (id: string) => void
  quantity: number
  setQuantity: (fn: (q: number) => number) => void
  maxQuantity: number
  soldOut: boolean
  onBuy: () => void
  onAddToCart: () => void
  adding: boolean
}

/** Frame Mobile / Detalhes do NFT: imagem de ponta a ponta, folha de detalhes e barra de compra fixa. */
export function MobileNftDetail({ nft, state }: { nft: Nft; state: PurchaseState }) {
  const router = useRouter()
  const { imageIndex, setImageIndex, edition, selectEdition, quantity, setQuantity, maxQuantity, soldOut } = state
  const image = nft.images[imageIndex]

  function back() {
    if (window.history.length > 1) router.history.back()
    else router.navigate({ to: '/', hash: 'produtos' })
  }

  return (
    <div className="-mx-6 -mt-10 flex flex-col md:hidden">
      <section className="relative bg-[linear-gradient(137.6deg,#241612_12%,#2f1d15_106.6%)] px-7 pt-6 pb-[83px]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            aria-label="Voltar"
            className="grid size-[35px] place-items-center rounded-full border border-border bg-[#2f1d15]"
          >
            <img src={arrowLeft} alt="" width={13.17} height={7.33} className="rotate-90" />
          </button>
          <FavoriteButton variant="icon" nftId={nft.id} nftName={nft.name} className="size-[35px]" />
        </div>
        <img
          src={image.src}
          srcSet={`${image.thumb} 480w, ${image.src} 960w`}
          sizes="100vw"
          alt={image.alt}
          width={361}
          height={356}
          fetchPriority="high"
          className="mt-2 h-[356px] w-full rounded-3xl object-cover"
        />
        {nft.images.length > 1 && (
          <div className="absolute top-[356px] left-1/2 flex -translate-x-1/2" role="group" aria-label="Imagens">
            {nft.images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setImageIndex(i)}
                aria-label={`Ver imagem ${i + 1}`}
                aria-pressed={i === imageIndex}
                // Alvo de toque de 24px em volta do ponto do Figma.
                className="grid h-6 min-w-6 place-items-center px-0.5"
              >
                <span aria-hidden className={cn('h-[7px] rounded-full transition-all', i === imageIndex ? 'w-6 bg-primary' : 'w-[7px] bg-primary/40')} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="relative z-10 -mt-[114px] flex flex-col gap-3 rounded-t-[31px] bg-surface-card px-6 pt-8 pb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl/4 font-bold text-foreground">{nft.name}</h1>
          <p className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-sm leading-4 text-foreground">
            <Heart className="size-3.5 fill-primary text-primary" aria-hidden />
            <span className="sr-only">Favoritado por</span>
            {nft.likes}
          </p>
        </div>
        <p className="text-sm/6 text-text-secondary">{nft.description}</p>
        <div className="flex flex-col gap-2">
          <h2 id="edition-label-m" className="text-[15px]/4 font-bold text-foreground">
            Edição:
          </h2>
          <div role="radiogroup" aria-labelledby="edition-label-m" className="flex flex-wrap gap-3">
            {nft.editions.map((e) => {
              const selected = e.id === edition.id
              return (
                <button
                  key={e.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectEdition(e.id)}
                  className={cn(
                    'h-7 rounded-full border px-2 text-sm leading-4',
                    selected ? 'border-primary font-medium text-text-accent' : 'border-border text-text-secondary',
                    e.available === 0 && 'line-through opacity-60',
                  )}
                >
                  {e.name} · {e.available}/{e.supply}
                </button>
              )
            })}
          </div>
          {soldOut && <p className="text-sm text-text-secondary">Esta edição está esgotada.</p>}
        </div>
        <dl className="flex flex-col gap-3 text-[15px] text-secondary">
          <div>
            <dt className="inline">ID do token: </dt>
            <dd className="inline">#{nft.id.replace('nft_', '')}</dd>
          </div>
          <div>
            <dt className="inline">Coleção: </dt>
            <dd className="inline">{nft.collection.name}</dd>
          </div>
          <div>
            <dt className="inline">Criador: </dt>
            <dd className="inline">{nft.creator.name}</dd>
          </div>
        </dl>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-5 rounded-t-[40px] bg-surface-card px-6 pt-5 pb-9 drop-shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px]/4 font-medium text-text-secondary">Qtd.</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={soldOut || quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
                className="grid h-[30px] w-5 place-items-center rounded-[20px] border border-ink bg-primary disabled:opacity-40"
              >
                <img src={minusIcon} alt="" width={16} height={16} />
              </button>
              <output aria-live="polite" aria-label="Quantidade" className="text-lg/[25px] font-medium text-foreground">
                {soldOut ? 0 : quantity}
              </output>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={soldOut || quantity >= maxQuantity}
                onClick={() => setQuantity((q) => q + 1)}
                className="grid h-[30px] w-5 place-items-center rounded-[20px] border border-ink bg-primary disabled:opacity-40"
              >
                <img src={plusIcon} alt="" width={16} height={16} />
              </button>
            </div>
          </div>
          <p className="text-xl/4 font-bold text-text-accent">{formatEth(edition.priceEth)}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={soldOut || state.adding}
            aria-busy={state.adding}
            onClick={state.onBuy}
            className="h-[60px] flex-1 rounded-[40px] bg-[linear-gradient(100deg,#d28a4c_4%,rgba(210,138,76,0.8)_122%)] text-base/5 font-bold text-ink disabled:opacity-50"
          >
            {soldOut ? 'Esgotado' : 'Comprar NFT'}
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            disabled={soldOut || state.adding}
            onClick={state.onAddToCart}
            className="grid size-[60px] place-items-center rounded-[40px] border border-border bg-[#2f1d15] disabled:opacity-50"
          >
            <img src={shopIcon} alt="" width={20} height={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
