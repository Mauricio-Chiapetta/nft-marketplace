import { Link } from '@tanstack/react-router'
import { useLogout } from '@/features/auth/api'

const tab =
  'border-b-2 border-transparent px-1 pb-2 text-[15px]/4 font-bold text-text-secondary transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-text-accent'

/** Trilha + abas entre perfil e carteiras (sem frame no Figma: segue o padrão do checkout). */
export function AccountNav({ current }: { current: 'Perfil' | 'Carteiras' }) {
  const logout = useLogout()
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
        {/* No mobile o header (com o menu do usuário) dá lugar à tab bar: o logout fica aqui. */}
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="ml-auto px-1 pb-2 text-[15px]/4 font-bold text-text-secondary hover:text-foreground disabled:opacity-50 md:hidden"
        >
          {logout.isPending ? 'Saindo…' : 'Sair'}
        </button>
      </nav>
    </div>
  )
}
