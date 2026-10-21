import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/lib/session'

// Guarda das rotas privadas: sem sessão válida, vai para o login e volta depois.
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.getValid()) {
      throw redirect({ to: '/entrar', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
