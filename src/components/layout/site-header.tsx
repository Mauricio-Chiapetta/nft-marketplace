import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import searchIcon from '@/assets/icons/search.svg'
import cartIcon from '@/assets/icons/cart.svg'
import badgeIcon from '@/assets/icons/badge.svg'
import logoutIcon from '@/assets/icons/logout.svg'

// Itens sem tela no escopo ficam visíveis (como no Figma), mas desabilitados.
// Mercado fica ativo no fluxo de compra (detalhe, carrinho, pagamento).
const NAV = [
  { label: 'Início', key: 'home' },
  { label: 'Mercado', key: 'market' },
  { label: 'Criadores' },
  { label: 'Aprenda' },
] as const

const MARKET_PATHS = ['/nfts', '/cart', '/checkout']

export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const section = MARKET_PATHS.some((p) => pathname.startsWith(p)) ? 'market' : 'home'
  // O Figma omite a divisória nas telas do Mercado.
  const divider = section === 'home'

  return (
    <header className={cn('w-full', divider && 'border-b-[0.3px] border-primary')}>
      <div className="flex items-start justify-between gap-6">
        <Link to="/" className="pt-2 text-sm font-bold tracking-[1.4px] text-foreground md:w-40">
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden gap-10 md:flex">
          {NAV.map((item) => {
            if (!('key' in item)) {
              return (
                <span
                  key={item.label}
                  aria-disabled="true"
                  title="Em breve"
                  className="cursor-not-allowed text-base text-foreground/60"
                >
                  {item.label}
                </span>
              )
            }
            const isActive = item.key === section
            return (
              <Link
                key={item.label}
                to="/"
                hash={item.key === 'market' ? 'produtos' : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={cn('flex flex-col gap-6 text-base', isActive ? 'font-bold text-text-accent' : 'text-foreground')}
              >
                {item.label}
                <span className={cn('h-[3px] w-full', isActive ? 'bg-primary' : 'bg-transparent')} />
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-7">
          <button type="button" aria-label="Buscar" className="grid size-6 place-items-center">
            <img src={searchIcon} alt="" width={20} height={20} />
          </button>
          <button
            type="button"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            className="relative h-6 w-[31px]"
          >
            <img src={cartIcon} alt="" width={24} height={24} className="absolute left-0 top-0" />
            {cartCount > 0 && (
              <span className="absolute left-[13px] -top-0.5 grid size-5 place-items-center">
                <img src={badgeIcon} alt="" width={20} height={20} className="absolute inset-0" />
                <span className="relative text-[10px] font-medium leading-none text-ink">{cartCount}</span>
              </span>
            )}
          </button>
          <button
            type="button"
            className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-md bg-primary text-base font-medium text-ink transition-colors hover:bg-text-accent"
          >
            <img src={logoutIcon} alt="" width={17.78} height={16.92} className="m-[2px]" />
            Entrar
          </button>
        </div>
      </div>
    </header>
  )
}
