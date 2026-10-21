import filterIcon from '@/assets/icons/mobile/filter.svg'
import heroMask from '@/assets/icons/mobile/hero-mask.svg'
import arrowRight from '@/assets/icons/mobile/arrow-right.svg'
import heroDots from '@/assets/icons/mobile/hero-dots.svg'
import { CatalogSearchInput } from '@/features/catalog/components/catalog-search-input'
import { FiltersDrawer } from '@/features/catalog/components/filters-drawer'

/** Topo da Início no mobile (frame Mobile / Início): busca, filtros e banner. */
export function MobileHomeTop() {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <div className="flex gap-2">
        <CatalogSearchInput />
        <FiltersDrawer
          trigger={
            <button
              type="button"
              aria-label="Filtros"
              className="grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(137deg,rgba(210,138,76,0.45)_24.6%,#d28a4c_100%)]"
            >
              <img src={filterIcon} alt="" width={16.15} height={16.11} />
            </button>
          }
        />
      </div>

      <section className="relative flex h-[190px] items-center gap-2 overflow-hidden rounded-[12px] p-4">
        <img src={heroMask} alt="" className="pointer-events-none absolute inset-0 size-full max-w-none" />
        <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-xs font-medium leading-4 text-foreground">Bem-vindo à Kurio</p>
          <h1 className="text-lg/[29px] font-bold text-foreground">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </h1>
          <p className="text-xs/[18px] text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
          <a href="#produtos" className="flex items-center gap-2 text-xs/[14px] font-bold text-text-accent">
            EXPLORAR
            <img src={arrowRight} alt="" width={9.53} height={11.5} className="-rotate-90" />
          </a>
        </div>
        <div className="relative size-[138px] shrink-0">
          <img
            src="/nfts/jungle-1-480.webp"
            alt="Ilustração de um macaco de óculos redondos e jaqueta verde"
            width={138}
            height={138}
            fetchPriority="high"
            className="size-full rounded-2xl object-cover"
          />
          <img
            src="/nfts/jungle-4-480.webp"
            alt=""
            width={58}
            height={58}
            className="absolute top-[88px] -left-[14px] size-[58px] rounded-2xl object-cover"
          />
        </div>
        <img src={heroDots} alt="" width={33} height={7} className="absolute bottom-3 left-1/2 -translate-x-1/2" />
      </section>
    </div>
  )
}
