import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { toast } from 'sonner'
import zoomIcon from '@/assets/icons/zoom.svg'
import minusIcon from '@/assets/icons/minus.svg'
import plusIcon from '@/assets/icons/plus.svg'
import heartIcon from '@/assets/icons/heart.svg'
import shareLinkedin from '@/assets/icons/share-linkedin.svg'
import shareEmail from '@/assets/icons/share-email.svg'
import shareTwitter from '@/assets/icons/share-twitter.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import type { Nft } from '@/types/api'

export function NftDetail({ nft }: { nft: Nft }) {
  const [imageIndex, setImageIndex] = useState(0)
  const firstAvailable = nft.editions.find((e) => e.available > 0) ?? nft.editions[0]
  const [editionId, setEditionId] = useState(firstAvailable.id)
  const [quantity, setQuantity] = useState(1)

  const edition = nft.editions.find((e) => e.id === editionId) ?? firstAvailable
  const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
  const soldOut = edition.available === 0
  const image = nft.images[imageIndex]

  function selectEdition(id: string) {
    setEditionId(id)
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Trilha" className="text-[15px] font-bold leading-4 text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>
        {' / '}
        <Link to="/" hash="produtos" className="hover:text-text-accent">
          Mercado
        </Link>
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Galeria */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:gap-7 lg:w-[573px] lg:shrink-0">
          <ul className="flex gap-4 sm:w-[100px] sm:shrink-0 sm:flex-col">
            {nft.images.map((img, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Ver imagem ${i + 1}`}
                  aria-pressed={i === imageIndex}
                  className={cn(
                    'block size-[72px] overflow-hidden rounded-lg border sm:size-[100px]',
                    i === imageIndex ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <img src={img.thumb} alt="" width={100} height={100} className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
          <div className="relative flex aspect-square w-full items-center justify-center rounded-md bg-surface-card p-4 sm:max-w-[444px]">
            <img
              src={image.src}
              srcSet={`${image.thumb} 480w, ${image.src} 960w`}
              sizes="(min-width: 640px) 404px, 100vw"
              alt={image.alt}
              width={404}
              height={404}
              fetchPriority="high"
              className="size-full rounded-3xl object-cover"
            />
            <a
              href={image.src}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir imagem em tamanho original"
              className="absolute top-[15px] right-[15px] sm:-right-[43px] lg:right-auto lg:left-[402px]"
            >
              <img src={zoomIcon} alt="" width={30} height={30} />
            </a>
          </div>
        </div>

        {/* Informações */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-6">
          <div className="flex flex-col gap-3 border-b-[0.3px] border-primary pb-3">
            <h1 className="text-[28px] font-bold text-foreground">{nft.name}</h1>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[22px] font-bold leading-4 text-text-accent">{formatEth(edition.priceEth)}</p>
              <p className="flex items-center gap-1 text-[15px] text-foreground">
                <img src={heartIcon} alt="" width={15} height={15} />
                {nft.likes} colecionadores favoritaram
              </p>
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold leading-4 text-foreground">Sobre este NFT:</h2>
            <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 id="edition-label" className="text-[15px] font-bold leading-4 text-foreground">
              Edição:
            </h2>
            <div role="radiogroup" aria-labelledby="edition-label" className="flex flex-wrap gap-1.5">
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
                      selected
                        ? 'border-primary font-medium text-text-accent'
                        : 'border-border text-text-secondary hover:border-border-soft',
                      e.available === 0 && 'line-through opacity-60',
                    )}
                  >
                    {e.name} · {e.available}/{e.supply}
                  </button>
                )
              })}
            </div>
            {soldOut && <p className="text-sm text-text-secondary">Esta edição está esgotada.</p>}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StepperButton
                icon={minusIcon}
                label="Diminuir quantidade"
                disabled={soldOut || quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
              />
              <output aria-live="polite" aria-label="Quantidade" className="w-4 text-center text-xl leading-7 text-foreground">
                {soldOut ? 0 : quantity}
              </output>
              <StepperButton
                icon={plusIcon}
                label="Aumentar quantidade"
                disabled={soldOut || quantity >= maxQuantity}
                onClick={() => setQuantity((q) => q + 1)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={soldOut}
                // O carrinho entra na fase 4; até lá o botão não simula sucesso.
                onClick={() => toast.info('O carrinho ainda não está disponível.')}
                className="h-10 w-[130px] rounded-md bg-primary text-sm font-bold leading-5 text-ink transition-colors hover:bg-text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {soldOut ? 'ESGOTADO' : 'COMPRAR'}
              </button>
              <button
                type="button"
                onClick={() => toast.info('Favoritos ainda não estão disponíveis.')}
                className="flex h-10 w-[130px] items-center justify-center gap-2 rounded-md border border-primary text-sm font-medium leading-5 text-text-accent transition-colors hover:bg-primary/10"
              >
                <img src={heartIcon} alt="" width={20} height={20} />
                Favoritar
              </button>
            </div>
          </div>
          {!soldOut && maxQuantity > 1 && (
            <p className="-mt-3 text-xs text-text-secondary">Máximo de {maxQuantity} por pedido.</p>
          )}

          <div className="flex flex-col gap-3">
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
                <dd className="inline">
                  {nft.creator.name} ({nft.creator.handle})
                </dd>
              </div>
            </dl>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold leading-4 text-foreground">Compartilhar este NFT:</p>
              <ShareLinks nft={nft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepperButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[49.5px] w-[33px] items-center justify-center rounded-[33px] border border-ink bg-primary drop-shadow-[0_6.6px_9.9px_rgba(20,13,10,0.15)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
    >
      <img src={icon} alt="" width={26.4} height={26.4} />
    </button>
  )
}

function ShareLinks({ nft }: { nft: Nft }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = encodeURIComponent(`${nft.name} na Kurio`)
  const encodedUrl = encodeURIComponent(url)
  return (
    <ul className="flex items-center gap-2">
      <li>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no LinkedIn">
          <img src={shareLinkedin} alt="" width={15} height={14.38} />
        </a>
      </li>
      <li>
        <a href={`mailto:?subject=${text}&body=${encodedUrl}`} aria-label="Compartilhar por e-mail">
          <img src={shareEmail} alt="" width={18} height={18} />
        </a>
      </li>
      <li>
        <a href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no Twitter">
          <img src={shareTwitter} alt="" width={15.97} height={12.19} />
        </a>
      </li>
    </ul>
  )
}

export function NftDescription({ nft }: { nft: Nft }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="border-b-[0.3px] border-primary">
        <h2 className="inline-flex flex-col gap-3 text-[17px] font-bold leading-4 text-text-accent">
          Detalhes do NFT
          <span className="h-[3px] w-full bg-primary" />
        </h2>
      </div>
      <div className="flex flex-col gap-3 text-sm leading-6">
        <p className="text-text-secondary">{nft.description}</p>
        <div>
          <h3 className="font-bold text-foreground">Edições:</h3>
          <ul className="text-text-secondary">
            {nft.editions.map((e) => (
              <li key={e.id}>
                {e.name}: {formatEth(e.priceEth)}, {e.available} de {e.supply} disponíveis, até {e.maxPerOrder} por pedido.
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-foreground">Rede:</h3>
          <p className="text-text-secondary">Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.</p>
        </div>
        <div>
          <h3 className="font-bold text-foreground">Direitos autorais:</h3>
          <p className="text-text-secondary">
            Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
          </p>
        </div>
      </div>
    </section>
  )
}

export function NftDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row" aria-busy="true" aria-label="Carregando NFT">
      <div className="flex gap-7 lg:w-[573px]">
        <div className="hidden w-[100px] flex-col gap-4 sm:flex">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="size-[100px] rounded-lg bg-surface-card" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full max-w-[444px] rounded-md bg-surface-card" />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-8 w-2/3 bg-surface-card" />
        <Skeleton className="h-6 w-1/4 bg-surface-card" />
        <Skeleton className="h-24 w-full bg-surface-card" />
        <Skeleton className="h-10 w-1/2 bg-surface-card" />
      </div>
    </div>
  )
}
