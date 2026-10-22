import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/session'
import { CheckoutPage } from '@/features/checkout/components/checkout-page'

export const Route = createFileRoute('/_authed/checkout')({
  component: CheckoutRoute,
})

function CheckoutRoute() {
  const session = useSession()
  // A guarda do _authed garante a sessão; key reinicia o estado se o usuário mudar.
  if (!session) return null
  return <CheckoutPage key={session.user.id} session={session} />
}
