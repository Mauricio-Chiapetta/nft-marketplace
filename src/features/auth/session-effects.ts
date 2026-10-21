import { toast } from 'sonner'
import type { router as appRouter } from '@/lib/router'
import { sessionStore } from '@/lib/session'
import { clearPrivateState } from './private-state'
import { isProtectedPath } from './redirect'

/** Reações ao fim da sessão, em qualquer ponto do app (logout, 401, expiração, outra aba). */
export function installSessionEffects(router: typeof appRouter) {
  return sessionStore.onEnd((reason) => {
    clearPrivateState()
    const href = router.state.location.href

    if (reason === 'expired') {
      toast.warning('Sua sessão expirou. Entre novamente para continuar.', { id: 'session-expired' })
      // Preserva onde o usuário estava para retomar depois do login.
      if (isProtectedPath(href)) router.navigate({ to: '/entrar', search: { redirect: href } })
      return
    }
    if (isProtectedPath(href)) router.navigate({ to: '/' })
  })
}
