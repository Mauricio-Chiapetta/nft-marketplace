import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/session'

// Placeholder protegido; a tela de perfil entra na fase 6.
export const Route = createFileRoute('/_authed/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const session = useSession()
  if (!session) return null
  return (
    <section className="flex flex-col gap-3 py-16">
      <h1 className="text-[28px] font-bold text-foreground">Olá, {session.user.name}</h1>
      <p className="text-text-secondary">
        {session.user.email} · @{session.user.username}
      </p>
      <p className="text-sm text-text-secondary">A edição de perfil e carteiras chega em breve.</p>
    </section>
  )
}
