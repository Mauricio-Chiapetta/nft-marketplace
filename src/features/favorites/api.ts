import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { toApiError } from '@/lib/api-error'
import { useSession } from '@/lib/session'
import type { Favorites } from '@/types/api'

// Chave inclui o usuário: o cache de um nunca aparece para o outro.
export const favoritesKey = (userId: string) => ['me', userId, 'favorites'] as const

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: favoritesKey(userId),
    queryFn: ({ signal }) => api.get<Favorites>('/me/favorites', { signal }).then((r) => r.data),
  })

export function useFavorites() {
  const session = useSession()
  const query = useQuery({ ...favoritesQuery(session?.user.id ?? ''), enabled: Boolean(session) })
  return { ...query, ids: new Set(query.data?.nftIds ?? []), userId: session?.user.id }
}

/** Alterna o favorito com atualização otimista e rollback se a API recusar. */
export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient()
  const session = useSession()
  const userId = session?.user.id ?? ''
  const key = favoritesKey(userId)

  return useMutation({
    mutationKey: ['favorite', nftId],
    // Cliques repetidos no mesmo NFT rodam em série, na ordem em que aconteceram.
    scope: { id: `favorite:${nftId}` },
    mutationFn: (favorite: boolean) =>
      (favorite ? api.put<Favorites>(`/me/favorites/${nftId}`) : api.delete<Favorites>(`/me/favorites/${nftId}`)).then(
        (r) => r.data,
      ),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (old) => {
        const ids = new Set(old?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (error, favorite, context) => {
      queryClient.setQueryData(key, context?.previous)
      // 401 já é tratado pelo fim de sessão; aqui só falhas da operação.
      if (toApiError(error).status !== 401) {
        toast.error(favorite ? 'Não foi possível favoritar. Tente novamente.' : 'Não foi possível remover dos favoritos.')
      }
    },
    onSettled: () => {
      // Só reconcilia quando não há outra alteração de favoritos em andamento.
      if (queryClient.isMutating({ mutationKey: ['favorite'] }) === 1) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
