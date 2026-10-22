import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { sessionStore } from '@/lib/session'
import type { LoginInput, RegisterInput, Session } from '@/types/api'
import { toast } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { cartKeys, cartOwner, mergeGuestCart } from '@/features/cart/api'
import { clearPrivateState } from './private-state'

async function startSession(session: Session) {
  // Nada do usuário anterior (ou do visitante) pode vazar para o novo.
  clearPrivateState()
  sessionStore.set(session)
  // O carrinho do visitante fica no servidor (guest id): o merge não depende do cache.
  const merged = await mergeGuestCart()
  if (!merged) return
  queryClient.setQueryData(cartKeys.cart(cartOwner(session.user.id)), merged.cart)
  if (merged.adjustments.length) {
    toast.warning('Algumas quantidades do seu carrinho foram ajustadas ao limite ou ao estoque disponível.')
  }
}

export function useLogin() {
  return useMutation({
    // gcTime 0: as variáveis (com a senha) não ficam no MutationCache nem no devtools.
    gcTime: 0,
    mutationFn: (input: LoginInput) => api.post<Session>('/auth/login', input).then((r) => r.data),
    onSuccess: startSession,
  })
}

export function useRegister() {
  return useMutation({
    gcTime: 0,
    mutationFn: (input: RegisterInput) => api.post<Session>('/auth/register', input).then((r) => r.data),
    onSuccess: startSession,
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Falha de rede não impede o logout local; o token expira no servidor.
      await api.post('/auth/logout').catch(() => undefined)
    },
    onSettled: () => sessionStore.end('logout'),
  })
}

/** Confere a sessão salva com a API (ex.: após refresh). 401 encerra via interceptor. */
export async function revalidateSession() {
  const session = sessionStore.getValid()
  if (!session) return
  try {
    const fresh = await api.get<Session>('/auth/session').then((r) => r.data)
    if (sessionStore.get()?.token === fresh.token) sessionStore.updateUser(fresh.user)
  } catch {
    // Erros transitórios mantêm a sessão; 401 já foi tratado no interceptor.
  }
}
