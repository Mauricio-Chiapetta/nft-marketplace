import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { api } from '@/lib/api'
import { toApiError } from '@/lib/api-error'
import { useSession } from '@/lib/session'
import { cartKeys } from '@/features/cart/api'
import { orderKeys } from '@/features/orders/keys'
import type { Order, Quote, QuoteStaleDetails } from '@/types/api'
import { checkoutStorage, type OrderAttempt } from './storage'

export type ValidationResult = { quote: Quote; changed: boolean }

/** Revalida preço, estoque, cupom e taxa. 409 traz a cotação nova, que exige nova confirmação. */
export async function revalidateQuote(quoteId: string): Promise<ValidationResult> {
  try {
    const quote = await api.post<Quote>(`/quotes/${quoteId}/validate`).then((r) => r.data)
    return { quote, changed: false }
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError.code === 'QUOTE_STALE' || apiError.code === 'QUOTE_EXPIRED') {
      return { quote: (apiError.details as QuoteStaleDetails).quote, changed: true }
    }
    throw error
  }
}

/** Sem resposta (timeout/rede): o pedido pode ter sido criado; reenviar com a mesma chave. */
export function isUncertain(error: unknown) {
  return isAxiosError(error) && !error.response
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = useSession()?.user.id ?? ''

  return useMutation({
    mutationKey: ['place-order'],
    // Sem retry automático: o reenvio é sempre com a mesma chave, por decisão explícita.
    retry: false,
    mutationFn: (attempt: OrderAttempt) => {
      // Gravada antes do envio: refresh no meio do POST ainda recupera o pedido.
      checkoutStorage.saveAttempt(userId, attempt)
      return api
        .post<Order>('/orders', attempt.body, { headers: { 'Idempotency-Key': attempt.key } })
        .then((r) => r.data)
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(userId, order.id), order)
      checkoutStorage.clearAttempt(userId)
      checkoutStorage.clearDraft(userId)
      navigate({ to: '/pedidos/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      // Erro definitivo da API: a tentativa acabou; só a incerteza mantém a chave.
      if (!isUncertain(error)) checkoutStorage.clearAttempt(userId)
      const code = toApiError(error).code
      if (code === 'OUT_OF_STOCK' || code === 'QUOTE_STALE' || code === 'QUOTE_EXPIRED') {
        queryClient.invalidateQueries({ queryKey: cartKeys.all })
      }
    },
  })
}
