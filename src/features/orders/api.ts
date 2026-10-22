import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Order } from '@/types/api'
import { orderKeys } from './keys'

/** Enquanto pendente, o `order.updated` do socket atualiza o cache; o polling é só reserva. */
const PENDING_POLL_MS = 5_000

export function useOrder(orderId: string) {
  const userId = useSession()?.user.id ?? ''
  return useQuery({
    queryKey: orderKeys.detail(userId, orderId),
    queryFn: ({ signal }) => api.get<Order>(`/orders/${orderId}`, { signal }).then((r) => r.data),
    enabled: Boolean(userId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_POLL_MS : false),
    // Pedidos confirmados e recusados são terminais: não há o que revalidar.
    staleTime: (query) => (query.state.data && query.state.data.status !== 'pending' ? Infinity : 0),
  })
}
