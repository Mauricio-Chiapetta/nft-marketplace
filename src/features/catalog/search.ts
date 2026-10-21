import type { NftCategory, NftListParams, NftSort } from '@/types/api'

// Estado do catálogo na URL. Valores inválidos são descartados (link sempre abre).

export type CatalogView = 'all' | 'new' | 'trending'

export interface CatalogSearch {
  q?: string
  page?: number
  sort?: NftSort
  view?: CatalogView
  /** Categorias separadas por vírgula. */
  category?: string
  min?: string
  max?: string
}

export const PAGE_SIZE = 9
export const DEFAULT_SORT: NftSort = 'recent'

export const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  popular: 'Mais favoritados',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
}

const SORTS = Object.keys(SORT_LABELS) as NftSort[]
const VIEWS: CatalogView[] = ['all', 'new', 'trending']
const CATEGORIES: NftCategory[] = ['art', 'collectibles', 'music', 'photography', 'gaming', 'utility']
const ETH = /^\d+(\.\d{1,18})?$/

/** As abas são atalhos que fixam a ordenação. */
export const VIEW_SORT: Partial<Record<CatalogView, NftSort>> = { new: 'recent', trending: 'popular' }

export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const out: CatalogSearch = {}
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 80) : ''
  if (q) out.q = q
  const page = Number(raw.page)
  if (Number.isInteger(page) && page > 1) out.page = page
  if (SORTS.includes(raw.sort as NftSort) && raw.sort !== DEFAULT_SORT) out.sort = raw.sort as NftSort
  if (VIEWS.includes(raw.view as CatalogView) && raw.view !== 'all') out.view = raw.view as CatalogView
  const category = parseCategories(raw.category)
  if (category.length) out.category = category.join(',')
  const min = typeof raw.min === 'string' || typeof raw.min === 'number' ? String(raw.min) : ''
  const max = typeof raw.max === 'string' || typeof raw.max === 'number' ? String(raw.max) : ''
  if (ETH.test(min)) out.min = min
  if (ETH.test(max)) out.max = max
  return out
}

export function parseCategories(value: unknown): NftCategory[] {
  if (typeof value !== 'string') return []
  const list = value.split(',').filter((c): c is NftCategory => CATEGORIES.includes(c as NftCategory))
  return [...new Set(list)]
}

export function effectiveSort(search: CatalogSearch): NftSort {
  return (search.view && VIEW_SORT[search.view]) ?? search.sort ?? DEFAULT_SORT
}

export function toListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
    sort: effectiveSort(search),
    category: parseCategories(search.category),
    minPrice: search.min,
    maxPrice: search.max,
  }
}

/** Qualquer mudança de filtro volta para a página 1. */
export function withFilter(prev: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  return validateCatalogSearch({ ...prev, ...patch, page: undefined })
}
