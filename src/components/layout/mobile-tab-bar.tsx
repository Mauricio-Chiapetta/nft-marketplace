import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import { toast } from 'sonner'
import tabbarBg from '@/assets/icons/mobile/tabbar-bg.svg'
import tabbarCenter from '@/assets/icons/mobile/tabbar-center.svg'
import homeIcon from '@/assets/icons/mobile/home.svg'
import heartIcon from '@/assets/icons/mobile/heart.svg'
import shopIcon from '@/assets/icons/mobile/shop.svg'
import userIcon from '@/assets/icons/mobile/user.svg'
import scan1 from '@/assets/icons/mobile/scan-1.svg'
import scan2 from '@/assets/icons/mobile/scan-2.svg'
import scan3 from '@/assets/icons/mobile/scan-3.svg'
import scan4 from '@/assets/icons/mobile/scan-4.svg'
import scan5 from '@/assets/icons/mobile/scan-5.svg'
import { useSession } from '@/lib/session'

// Ícones do Figma usados como máscara, para a cor seguir o estado (ativo/inativo).
function MaskIcon({ src, width, height }: { src: string; width: number; height: number }) {
  return (
    <span
      aria-hidden
      className="block bg-current"
      style={{ width, height, maskImage: `url(${JSON.stringify(src)})`, maskSize: '100% 100%', WebkitMaskImage: `url(${JSON.stringify(src)})`, WebkitMaskSize: '100% 100%' }}
    />
  )
}

// Peças do ícone central (scanner), nas posições do Figma dentro de 414×126.
const SCAN_PARTS = [
  { src: scan1, inset: 'inset-[25.48%_46.66%_73.1%_46.86%]' },
  { src: scan2, inset: 'inset-[27.53%_50.32%_64.29%_47.18%]' },
  { src: scan3, inset: 'inset-[16.73%_46.98%_75.09%_50.51%]' },
  { src: scan4, inset: 'inset-[27.54%_47%_64.33%_50.51%]' },
  { src: scan5, inset: 'inset-[16.67%_50.31%_75.15%_47.18%]' },
]

const soon = (what: string) => () => toast.info(`${what} ainda não está disponível.`)

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const session = useSession()
  const item = 'grid size-11 place-items-center rounded-full transition-colors'
  const color = (active: boolean) => (active ? 'text-text-accent' : 'text-text-secondary hover:text-text-accent')

  // No detalhe a barra de compra ocupa o rodapé (frame Mobile / Detalhes do NFT).
  if (pathname.startsWith('/nfts/')) return null

  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-40 h-[126px] md:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-[24.6%] bottom-0">
        {/* Margens negativas do Figma: a sombra do SVG passa da área da barra. */}
        <div className="absolute inset-[-42.13%_-7.25%_-21.06%_-7.25%]">
          <img src={tabbarBg} alt="" className="block size-full max-w-none" />
        </div>
      </div>
      <button
        type="button"
        aria-label="Escanear NFT"
        onClick={soon('A leitura de QR code')}
        className="absolute top-0 left-1/2 size-[65px] -translate-x-1/2"
      >
        <img src={tabbarCenter} alt="" width={65} height={65} className="absolute inset-0" />
      </button>
      <div className="pointer-events-none absolute inset-0">
        {SCAN_PARTS.map((part) => (
          <span key={part.src} className={`absolute ${part.inset}`}>
            <img src={part.src} alt="" className="absolute inset-0 block size-full max-w-none" />
          </span>
        ))}
      </div>

      <ul className="absolute inset-x-0 top-[56.35%] flex -translate-y-3 items-center justify-between px-[6%]">
        <li className="flex gap-[9%] basis-[38%]">
          <Link to="/" aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined} className={cn(item, color(pathname === '/'))}>
            <MaskIcon src={homeIcon} width={15.83} height={16.67} />
          </Link>
          <button type="button" aria-label="Favoritos" onClick={soon('A lista de favoritos')} className={cn(item, color(false))}>
            <MaskIcon src={heartIcon} width={20} height={17.79} />
          </button>
        </li>
        <li className="flex basis-[38%] justify-end gap-[9%]">
          <button type="button" aria-label="Carrinho" onClick={soon('O carrinho')} className={cn(item, color(false))}>
            <MaskIcon src={shopIcon} width={20} height={20} />
          </button>
          <Link
            to="/perfil"
            aria-label={session ? 'Meu perfil' : 'Entrar'}
            aria-current={pathname.startsWith('/perfil') ? 'page' : undefined}
            className={cn(item, color(pathname.startsWith('/perfil')))}
          >
            <MaskIcon src={userIcon} width={20} height={20} />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
