import { HttpResponse, http } from 'msw'
import { ethAdd, ethPercent } from '@/lib/eth'
import type { Network, QuoteStaleDetails } from '@/types/api'
import { NETWORK_FEES } from '../data/fixtures'
import { getDb } from '../db'
import { apiError, errors, readJson, resolveCartOwner } from '../http'
import { getScenario, onScenarioChange } from '../scenario'
import { createQuote, toQuoteDto, validateQuote, type QuoteValidation } from '../services/cart'
import { findEdition, updateNftEditions } from '../services/catalog'

const SCENARIO_EFFECT_DELAY_MS = 1500

export function isNetwork(value: unknown): value is Network {
  return typeof value === 'string' && value in NETWORK_FEES
}

export function quoteConflict(result: Extract<QuoteValidation, { ok: false }>) {
  const details: QuoteStaleDetails = { quote: toQuoteDto(result.fresh) }
  const message =
    result.code === 'QUOTE_EXPIRED'
      ? 'A cotação expirou. Revise os valores atualizados.'
      : 'Preço, disponibilidade ou taxas mudaram. Revise e confirme novamente.'
  return apiError(409, result.code, message, { details })
}

// Cenários price-change/sold-out: depois da primeira cotação, o catálogo muda
// pelo caminho normal (updateNftEditions), gerando também o evento nft.updated.
let scenarioEffectFired = false
onScenarioChange(() => {
  scenarioEffectFired = false
})

function triggerScenarioEffect(firstLine: { nftId: string; editionId: string } | undefined) {
  const { name } = getScenario()
  if (scenarioEffectFired || !firstLine || (name !== 'price-change' && name !== 'sold-out')) return
  scenarioEffectFired = true
  setTimeout(() => {
    const found = findEdition(firstLine.nftId, firstLine.editionId)
    if (!found) return
    const { edition } = found
    updateNftEditions(
      firstLine.nftId,
      name === 'price-change'
        ? [{ editionId: edition.id, priceEth: ethAdd(edition.priceEth, ethPercent(edition.priceEth, 10)) }]
        : [{ editionId: edition.id, available: 0 }],
    )
  }, SCENARIO_EFFECT_DELAY_MS)
}

export const quoteHandlers = [
  http.post('/api/quotes', async ({ request }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const network = (await readJson(request))?.network
    if (!isNetwork(network)) return errors.validation({ network: 'Selecione uma rede válida.' })

    const quote = createQuote(owner.ownerKey, network)
    triggerScenarioEffect(quote.lines[0])
    return HttpResponse.json(toQuoteDto(quote), { status: 201 })
  }),

  http.get('/api/quotes/:quoteId', ({ request, params }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const quote = getDb().quotes.find((q) => q.id === params.quoteId && q.ownerKey === owner.ownerKey)
    if (!quote) return errors.notFound('Cotação não encontrada.')
    return HttpResponse.json(toQuoteDto(quote))
  }),

  // Revalidação antes de confirmar: 409 com a cotação nova quando algo mudou.
  http.post('/api/quotes/:quoteId/validate', ({ request, params }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const quote = getDb().quotes.find((q) => q.id === params.quoteId && q.ownerKey === owner.ownerKey)
    if (!quote) return errors.notFound('Cotação não encontrada.')
    const result = validateQuote(quote)
    if (!result.ok) return quoteConflict(result)
    return HttpResponse.json(toQuoteDto(result.quote))
  }),
]
