import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { toApiError } from '@/lib/api-error'
import { getGuestId } from '@/lib/guest'
import { useSession } from '@/lib/session'
import type { Cart, CartItemInput, CartMergeResult, Network, Quote } from '@/types/api'

// O dono do carrinho entra na chave: visitante e cada usuário têm caches separados.
export const cartOwner = (userId: string | undefined) => (userId ? `user:${userId}` : 'guest')
export const cartKeys = {
  all: ['cart'] as const,
  cart: (owner: string) => ['cart', owner] as const,
  quote: (owner: string, network: Network, version: number) => ['cart', owner, 'quote', network, version] as const,
}

export function useCartOwner() {
  return cartOwner(useSession()?.user.id)
}

export function useCart() {
  const owner = useCartOwner()
  return useQuery({
    queryKey: cartKeys.cart(owner),
    queryFn: ({ signal }) => api.get<Cart>('/cart', { signal }).then((r) => r.data),
  })
}

/** Resumo de valores vindo da API (subtotal, desconto, taxa e total). */
export function useCartQuote(cart: Cart | undefined, network: Network = 'ethereum') {
  const owner = useCartOwner()
  return useQuery({
    queryKey: cartKeys.quote(owner, network, cart?.version ?? 0),
    queryFn: ({ signal }) => api.post<Quote>('/quotes', { network }, { signal }).then((r) => r.data),
    enabled: Boolean(cart && cart.items.length > 0),
    placeholderData: (previous) => previous,
  })
}

function useCartMutation<TInput>(request: (input: TInput) => Promise<Cart>, errorMessage?: string) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: request,
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.cart(owner), cart),
    onError: (error) => {
      // 401 é tratado pelo fim de sessão.
      const apiError = toApiError(error)
      if (apiError.status !== 401 && errorMessage !== undefined) toast.error(apiError.message || errorMessage)
    },
  })
}

export function useAddToCart() {
  return useCartMutation((input: CartItemInput) => api.post<Cart>('/cart/items', input).then((r) => r.data))
}

export function useUpdateCartItem() {
  return useCartMutation(
    ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity }).then((r) => r.data),
    'Não foi possível alterar a quantidade.',
  )
}

export function useRemoveCartItem() {
  return useCartMutation(
    (itemId: string) => api.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`).then((r) => r.data),
    'Não foi possível remover o item.',
  )
}

export function useApplyCoupon() {
  return useCartMutation((code: string) => api.put<Cart>('/cart/coupon', { code }).then((r) => r.data))
}

export function useRemoveCoupon() {
  return useCartMutation(() => api.delete<Cart>('/cart/coupon').then((r) => r.data), 'Não foi possível remover o cupom.')
}

/** Incorpora o carrinho do visitante ao do usuário recém-autenticado. */
export async function mergeGuestCart(): Promise<CartMergeResult | null> {
  try {
    return await api.post<CartMergeResult>('/cart/merge', { guestId: getGuestId() }).then((r) => r.data)
  } catch {
    // O carrinho do visitante continua no servidor; a próxima tentativa recupera.
    return null
  }
}
