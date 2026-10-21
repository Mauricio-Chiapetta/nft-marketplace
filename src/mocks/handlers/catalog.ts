import { HttpResponse, http } from 'msw'
import { ethCompare, ethMax, ethMin, isEthAmount } from '@/lib/eth'
import type { CatalogFacets, Nft, NftCategory, NftSort, Paginated } from '@/types/api'
import { CATEGORY_LABELS } from '../data/fixtures'
import { getDb } from '../db'
import { errors } from '../http'
import { scenarioIs } from '../scenario'
import { findNft, toNftDto } from '../services/catalog'

const SORTS: NftSort[] = ['recent', 'price-asc', 'price-desc', 'popular']
const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 48

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function csv(value: string | null): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : []
}

function positiveInt(value: string | null, fallback: number): number | null {
  if (value === null || value === '') return fallback
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : null
}

const sorters: Record<NftSort, (a: Nft, b: Nft) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  'price-asc': (a, b) => ethCompare(a.priceFromEth, b.priceFromEth),
  'price-desc': (a, b) => ethCompare(b.priceFromEth, a.priceFromEth),
  popular: (a, b) => b.likes - a.likes,
}

export const catalogHandlers = [
  http.get('/api/nfts', ({ request }) => {
    const params = new URL(request.url).searchParams
    const q = normalize(params.get('q')?.trim() ?? '')
    const categories = csv(params.get('category'))
    const collections = csv(params.get('collection'))
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const availability = params.get('availability') ?? 'all'
    const sort = (params.get('sort') ?? 'recent') as NftSort
    const page = positiveInt(params.get('page'), 1)
    const pageSize = positiveInt(params.get('pageSize'), DEFAULT_PAGE_SIZE)

    const fields: Record<string, string> = {}
    if (!SORTS.includes(sort)) fields.sort = 'Ordenação inválida.'
    if (availability !== 'all' && availability !== 'available') fields.availability = 'Disponibilidade inválida.'
    if (minPrice && !isEthAmount(minPrice)) fields.minPrice = 'Preço mínimo inválido.'
    if (maxPrice && !isEthAmount(maxPrice)) fields.maxPrice = 'Preço máximo inválido.'
    if (categories.some((c) => !(c in CATEGORY_LABELS))) fields.category = 'Categoria inválida.'
    if (page === null) fields.page = 'Página inválida.'
    if (pageSize === null || pageSize > MAX_PAGE_SIZE) fields.pageSize = `Use de 1 a ${MAX_PAGE_SIZE} itens por página.`
    if (Object.keys(fields).length) return errors.validation(fields, 'Parâmetros de busca inválidos.')

    let items = scenarioIs('empty') ? [] : getDb().nfts.map(toNftDto)
    if (q) {
      items = items.filter((n) =>
        [n.name, n.collection.name, n.creator.name, n.creator.handle].some((field) => normalize(field).includes(q)),
      )
    }
    if (categories.length) items = items.filter((n) => categories.includes(n.category))
    if (collections.length) items = items.filter((n) => collections.includes(n.collection.id))
    if (minPrice) items = items.filter((n) => ethCompare(n.priceFromEth, minPrice) >= 0)
    if (maxPrice) items = items.filter((n) => ethCompare(n.priceFromEth, maxPrice) <= 0)
    if (availability === 'available') items = items.filter((n) => n.totalAvailable > 0)
    if (params.get('featured') === 'true') items = items.filter((n) => n.featured)

    // Desempate por id mantém a paginação estável.
    items.sort((a, b) => sorters[sort](a, b) || a.id.localeCompare(b.id))

    const size = pageSize!
    const total = items.length
    const result: Paginated<Nft> = {
      items: items.slice((page! - 1) * size, page! * size),
      page: page!,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size),
    }
    return HttpResponse.json(result)
  }),

  http.get('/api/nfts/facets', () => {
    const nfts = scenarioIs('empty') ? [] : getDb().nfts.map(toNftDto)
    const prices = nfts.map((n) => n.priceFromEth)
    const collections = new Map<string, { id: string; name: string; count: number }>()
    for (const n of nfts) {
      const entry = collections.get(n.collection.id) ?? { ...n.collection, count: 0 }
      entry.count += 1
      collections.set(n.collection.id, entry)
    }
    const facets: CatalogFacets = {
      categories: (Object.keys(CATEGORY_LABELS) as NftCategory[]).map((value) => ({
        value,
        label: CATEGORY_LABELS[value],
        count: nfts.filter((n) => n.category === value).length,
      })),
      collections: [...collections.values()].sort((a, b) => a.name.localeCompare(b.name)),
      priceRange: prices.length ? { min: ethMin(...prices), max: ethMax(...prices) } : { min: '0', max: '0' },
    }
    return HttpResponse.json(facets)
  }),

  http.get('/api/nfts/:nftId', ({ params }) => {
    const nft = findNft(String(params.nftId))
    if (!nft) return errors.notFound('NFT não encontrado.')
    return HttpResponse.json(toNftDto(nft))
  }),
]
