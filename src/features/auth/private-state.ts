import { queryClient } from '@/lib/query-client'
import { socket } from '@/lib/socket'
import { catalogKeys } from '@/features/catalog/queries'

/** Descarta tudo que pertence ao usuário: cache privado do Query e conexão de tempo real. */
export function clearPrivateState() {
  queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] !== catalogKeys.all[0] })
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== catalogKeys.all[0] })
  queryClient.getMutationCache().clear()
  socket.disconnect()
}
