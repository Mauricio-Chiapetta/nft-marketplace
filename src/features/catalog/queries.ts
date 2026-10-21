import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CatalogFacets, Nft, NftListParams, Paginated } from '@/types/api'

export const catalogKeys = {
  all: ['nfts'] as const,
  list: (params: NftListParams) => [...catalogKeys.all, 'list', params] as const,
  facets: () => [...catalogKeys.all, 'facets'] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
}

function toQuery(params: NftListParams) {
  const { category, collection, ...rest } = params
  return {
    ...rest,
    category: category?.length ? category.join(',') : undefined,
    collection: collection?.length ? collection.join(',') : undefined,
  }
}

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: catalogKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<Nft>>('/nfts', { params: toQuery(params), signal }).then((r) => r.data),
  })

export const facetsQuery = () =>
  queryOptions({
    queryKey: catalogKeys.facets(),
    queryFn: ({ signal }) => api.get<CatalogFacets>('/nfts/facets', { signal }).then((r) => r.data),
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => api.get<Nft>(`/nfts/${id}`, { signal }).then((r) => r.data),
  })
