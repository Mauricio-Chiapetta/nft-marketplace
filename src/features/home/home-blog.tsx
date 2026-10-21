const POSTS = [
  {
    date: '12 de setembro',
    read: '6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: 'jungle-3',
  },
  {
    date: '13 de setembro',
    read: '2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: 'jungle-1',
  },
  {
    date: '15 de setembro',
    read: '3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: 'jungle-4',
  },
  {
    date: '15 de setembro',
    read: '2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: 'jungle-2',
  },
]

export function HomeBlog() {
  return (
    <section className="flex flex-col items-center gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 className="text-[28px] font-bold text-text-primary">Diário da Cunhagem</h2>
        <p className="text-sm text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-[repeat(4,268px)]">
        {POSTS.map((post) => (
          <article key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-surface-card">
            <img
              src={`/nfts/${post.image}-480.webp`}
              alt=""
              width={268}
              height={195}
              loading="lazy"
              className="h-[195px] w-full object-cover"
            />
            <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
              <p className="whitespace-pre-wrap text-xs font-medium leading-4 text-text-secondary">
                {`${post.date}  |  Leitura de ${post.read}`}
              </p>
              <h3 className="text-base font-bold text-text-primary">{post.title}</h3>
              <p className="text-xs font-medium leading-4 text-text-secondary">{post.text}</p>
              {/* Blog fora do escopo: CTA visual, sem navegação. */}
              <p className="flex gap-1 text-xs text-text-accent">
                <span className="font-bold leading-[14px]">Ler mais</span>
                <span aria-hidden>→</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
