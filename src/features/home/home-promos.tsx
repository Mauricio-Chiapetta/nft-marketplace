import arrowRight from '@/assets/icons/arrow-right.svg'
import promoMask from '@/assets/icons/promo-mask.svg'

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: 'jungle-1',
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: 'jungle-3',
  },
]

export function HomePromos() {
  return (
    <section className="grid gap-7 lg:grid-cols-2">
      {PROMOS.map((p) => (
        <article
          key={p.image}
          className="relative grid min-h-[250px] grid-cols-[40%_1fr] overflow-hidden rounded-lg bg-surface-card sm:h-[250px] sm:grid-cols-[minmax(0,292px)_1fr]"
        >
          <img
            src={`/nfts/${p.image}-480.webp`}
            alt=""
            width={292}
            height={250}
            loading="lazy"
            className="h-full w-full rounded-[18px] object-cover"
          />
          <img src={promoMask} alt="" width={586} height={250} className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="relative flex flex-col items-end gap-4 py-6 pr-4 pl-3 text-right sm:py-9 sm:pr-[30px] sm:pl-4">
            <h2 className="text-base font-bold leading-6 text-foreground sm:text-lg">
              {p.title[0]}
              <br />
              {p.title[1]}
            </h2>
            <p className="hidden max-w-[263px] text-sm leading-6 text-text-secondary sm:line-clamp-3">{p.text}</p>
            <a
              href="#produtos"
              className="mt-auto flex h-10 w-[140px] items-center justify-center gap-1 rounded-md bg-primary text-sm font-medium leading-5 text-ink transition-colors hover:bg-text-accent"
            >
              Explorar
              <img src={arrowRight} alt="" width={10.54} height={12.75} className="-rotate-90" />
            </a>
          </div>
        </article>
      ))}
    </section>
  )
}
