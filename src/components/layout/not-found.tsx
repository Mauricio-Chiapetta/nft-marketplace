import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 py-16">
      <p className="text-sm font-bold tracking-[1.4px] text-text-accent">ERRO 404</p>
      <h1 className="text-[28px] font-bold text-foreground">Página não encontrada</h1>
      <p className="text-text-secondary">O endereço pode estar incorreto ou a página foi removida.</p>
      <Link to="/" className="flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-ink hover:bg-text-accent">
        Voltar ao início
      </Link>
    </section>
  )
}
