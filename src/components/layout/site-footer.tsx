import facebookIcon from '@/assets/icons/facebook.svg'
import instagramIcon from '@/assets/icons/instagram.svg'
import twitterIcon from '@/assets/icons/twitter.svg'
import linkedinIcon from '@/assets/icons/linkedin.svg'
import youtubeIcon from '@/assets/icons/youtube.svg'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const LINK_COLUMNS = [
  {
    title: 'Meu perfil',
    links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    title: 'Central de ajuda',
    links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
]

const SOCIALS = [
  { label: 'Facebook', icon: facebookIcon },
  { label: 'Instagram', icon: instagramIcon },
  { label: 'Twitter', icon: twitterIcon },
  { label: 'LinkedIn', icon: linkedinIcon },
  { label: 'YouTube', icon: youtubeIcon },
]

export function SiteFooter() {
  return (
    <footer className="w-full">
      <section className="bg-surface-card p-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:flex lg:items-end lg:gap-0">
          {FEATURES.map((f) => (
            <div key={f.letter} className="flex flex-col gap-3 lg:flex-1 lg:border-r lg:border-primary lg:px-4">
              <span className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink">
                {f.letter}
              </span>
              <h3 className="text-[17px] font-bold leading-4 text-foreground">{f.title}</h3>
              <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">{f.text}</p>
            </div>
          ))}
          <NewsletterForm />
        </div>
      </section>

      <section className="bg-surface-dark px-8 py-6 lg:py-8">
        <div className="grid gap-4 text-sm leading-[22px] text-foreground sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:items-center lg:gap-[92px]">
          <p className="py-2 font-bold tracking-[1.4px]">KURIO</p>
          <p>
            Feito para colecionadores,
            <br />
            criadores e cultura
          </p>
          <a href="mailto:contato@email.com" className="hover:text-text-accent">
            contato@email.com
          </a>
          <p>+55 11 4002 8922</p>
        </div>
      </section>

      <section className="bg-surface-card p-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[124px]">
          {LINK_COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-2 text-foreground">
              <h3 className="text-lg font-bold leading-4">{col.title}</h3>
              {/* Páginas fora do escopo do desafio: texto, sem aparentar link funcional. */}
              <ul className="text-sm leading-[30px]">
                {col.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h3 className="text-lg font-bold leading-4 text-foreground">Redes sociais</h3>
              <ul className="flex gap-2.5">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <img src={s.icon} alt={s.label} width={32} height={32} className="-m-px" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold leading-4 text-foreground">Carteiras compatíveis</h3>
              <p className="flex h-[26px] items-center justify-center whitespace-pre rounded-md border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.1px] text-text-accent">
                {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="py-1.5 text-center text-sm leading-[30px] text-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}

function NewsletterForm() {
  return (
    <div className="flex flex-col gap-3 sm:col-span-2 lg:w-[357px] lg:shrink-0 lg:self-stretch lg:px-4">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          // Newsletter não faz parte do escopo; não simula sucesso.
          e.preventDefault()
        }}
      >
        <label htmlFor="newsletter-email" className="text-lg font-bold leading-4 text-foreground">
          Antecipe-se ao próximo lançamento
        </label>
        <div className="flex h-10 rounded-md bg-surface-dark drop-shadow-[0_0_10px_rgba(10,6,4,0.45)]">
          <input
            id="newsletter-email"
            type="email"
            placeholder="digite seu e-mail..."
            className="min-w-0 flex-1 bg-transparent pl-3 text-sm text-foreground outline-none placeholder:text-secondary"
          />
          <button
            type="submit"
            disabled
            title="Em breve"
            className="w-[85px] rounded-r-md bg-primary pl-4 pr-1 text-lg font-bold text-ink disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </div>
      </form>
      <p className="text-[13px] leading-[22px] text-text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </div>
  )
}
