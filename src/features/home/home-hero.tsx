import heroDots from '@/assets/icons/hero-dots.svg'

export function HomeHero() {
  return (
    <section className="flex flex-col-reverse items-center gap-10 py-6 md:flex-row md:justify-between md:py-0 md:pl-10 lg:h-[450px]">
      <div className="flex w-full flex-col gap-8 md:max-w-[600px] md:gap-11">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-4 tracking-[1.4px] text-foreground">Bem-vindo à Kurio</p>
            <h1 className="mt-2 text-[28px] font-bold leading-[44px] text-foreground sm:text-[43px] sm:leading-[70px]">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
              artistas e tenha uma parte da cultura da internet.
            </p>
          </div>
          <a
            href="#produtos"
            className="flex h-10 w-[140px] items-center justify-center rounded-md bg-primary text-base font-bold leading-5 text-ink transition-colors hover:bg-text-accent"
          >
            EXPLORAR
          </a>
        </div>
        <img src={heroDots} alt="" width={40} height={8} className="hidden self-end md:block" />
      </div>
      <img
        src="/nfts/jungle-1-960.webp"
        srcSet="/nfts/jungle-1-480.webp 480w, /nfts/jungle-1-960.webp 960w"
        sizes="(min-width: 768px) 450px, 100vw"
        alt="Ilustração de um macaco de óculos redondos e jaqueta verde"
        width={450}
        height={450}
        fetchPriority="high"
        className="aspect-square w-full max-w-[450px] shrink-0 rounded-3xl object-cover md:w-[42%] lg:w-[450px]"
      />
    </section>
  )
}
