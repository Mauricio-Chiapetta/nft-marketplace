import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import heartIcon from '@/assets/icons/heart.svg'
import cardHeartIcon from '@/assets/icons/mobile/card-heart.svg'
import { useSession } from '@/lib/session'
import { useFavorites, useToggleFavorite } from './api'

interface FavoriteButtonProps {
  nftId: string
  /** `icon`: botão redondo sobre a imagem do card (mobile no Figma). */
  variant?: 'button' | 'icon'
  nftName?: string
  className?: string
}

export function FavoriteButton({ nftId, variant = 'button', nftName, className }: FavoriteButtonProps) {
  const session = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const favorites = useFavorites()
  const toggle = useToggleFavorite(nftId)
  const active = favorites.ids.has(nftId)

  function onClick() {
    if (!session) {
      toast.info('Entre para salvar seus favoritos.')
      navigate({ to: '/entrar', search: { redirect: href } })
      return
    }
    toggle.mutate(!active)
  }

  const common = {
    type: 'button' as const,
    onClick,
    'aria-pressed': session ? active : undefined,
    disabled: Boolean(session) && favorites.isPending,
  }

  if (variant === 'icon') {
    return (
      <button
        {...common}
        aria-label={`${active ? 'Remover dos favoritos' : 'Favoritar'}${nftName ? `: ${nftName}` : ''}`}
        className={cn('grid size-7 place-items-center rounded-full disabled:opacity-60', className)}
      >
        {active ? (
          <span className="grid size-7 place-items-center rounded-full border border-border bg-[#2f1d15]">
            <Heart className="size-3.5 fill-primary text-primary" aria-hidden />
          </span>
        ) : (
          <img src={cardHeartIcon} alt="" width={28} height={28} />
        )}
      </button>
    )
  }

  return (
    <button
      {...common}
      className="flex h-10 w-[130px] items-center justify-center gap-2 rounded-md border border-primary text-sm font-medium leading-5 text-text-accent transition-colors hover:bg-primary/10 disabled:opacity-60 aria-pressed:bg-primary/15"
    >
      {active ? (
        <Heart className="size-5 fill-primary text-primary" strokeWidth={1.5} aria-hidden />
      ) : (
        <img src={heartIcon} alt="" width={20} height={20} />
      )}
      {active ? 'Favoritado' : 'Favoritar'}
    </button>
  )
}
