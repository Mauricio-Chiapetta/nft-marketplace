import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthDialog } from '@/features/auth/components/auth-dialog'
import { authSearch } from '@/features/auth/redirect'
import { HomePage } from '@/features/home/home-page'
import { sessionStore } from '@/lib/session'

// No desktop o formulário abre como modal sobre a Início (como no Figma);
// no mobile ocupa a tela inteira.
export const Route = createFileRoute('/entrar')({
  validateSearch: authSearch,
  beforeLoad: ({ search }) => {
    if (sessionStore.getValid()) throw redirect({ href: search.redirect ?? '/' })
  },
  component: function AuthRoute() {
    const { redirect } = Route.useSearch()
    return (
      <>
        <HomePage />
        <AuthDialog mode="login" redirect={redirect} />
      </>
    )
  },
})
