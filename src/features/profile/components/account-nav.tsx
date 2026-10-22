import { Link } from '@tanstack/react-router'

const tab =
  'border-b-2 border-transparent px-1 pb-2 text-[15px]/4 font-bold text-text-secondary transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-text-accent'

/** Trilha + abas entre perfil e carteiras (sem frame no Figma: segue o padrão do checkout). */
export function AccountNav({ current }: { current: 'Perfil' | 'Carteiras' }) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Trilha" className="text-[15px]/4 font-bold text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>
        {' / Minha conta / '}
        <span aria-current="page">{current}</span>
      </nav>
      <nav aria-label="Minha conta" className="flex gap-6 border-b-[0.3px] border-primary">
        <Link to="/perfil" className={tab}>
          Perfil
        </Link>
        <Link to="/carteiras" className={tab}>
          Carteiras
        </Link>
      </nav>
    </div>
  )
}
