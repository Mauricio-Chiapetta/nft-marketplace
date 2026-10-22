import { queryClient } from '@/lib/query-client'
import { catalogKeys } from '@/features/catalog/queries'

/**
 * Descarta tudo que pertence ao usuário: cache privado do Query e mutations.
 * A conexão de tempo real é refeita por `installRealtime` a cada troca de sessão,
 * sem herdar a identidade anterior.
 */
export function clearPrivateState() {
  queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] !== catalogKeys.all[0] })
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== catalogKeys.all[0] })
  queryClient.getMutationCache().clear()
}
