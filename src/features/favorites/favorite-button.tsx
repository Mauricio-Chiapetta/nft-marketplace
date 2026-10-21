import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import heartIcon from '@/assets/icons/heart.svg'
import { useSession } from '@/lib/session'
import { useFavorites, useToggleFavorite } from './api'

export function FavoriteButton({ nftId }: { nftId: string }) {
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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={session ? active : undefined}
      disabled={Boolean(session) && favorites.isPending}
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
