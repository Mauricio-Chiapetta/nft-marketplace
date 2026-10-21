import { HttpResponse, delay, http } from 'msw'
import type { Order, QuoteStaleDetails } from '@/types/api'
import { getDb, mutate, nextId, type OrderRecord } from '../db'
import { EMAIL_PATTERN, apiError, errors, readJson, requireUser, sha256, str } from '../http'
import { getScenario } from '../scenario'
import { toQuoteDto, validateQuote } from '../services/cart'
import { ORDER_SETTLE_MS, adjustStock, scheduleSettlement, settleDueOrders, toOrderDto } from '../services/orders'
import { isNetwork, quoteConflict } from './quotes'

/** Maior que o timeout do Axios (10 s): o cliente desiste antes da resposta chegar. */
const ORDER_TIMEOUT_DELAY_MS = 12_000

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const idempotencyKey = request.headers.get('Idempotency-Key') ?? ''
    if (!/^[\w-]{8,128}$/.test(idempotencyKey)) {
      return errors.validation({ idempotencyKey: 'Cabeçalho Idempotency-Key ausente ou inválido.' })
    }

    const body = await readJson(request)
    const buyer = body?.buyer && typeof body.buyer === 'object' ? (body.buyer as Record<string, unknown>) : {}
    const input = {
      quoteId: str(body?.quoteId),
      walletId: str(body?.walletId),
      network: body?.network,
      buyer: { fullName: str(buyer.fullName), email: str(buyer.email).toLowerCase() },
    }
    const bodyHash = await sha256(JSON.stringify(input))

    // A mesma tentativa recupera o mesmo pedido; outra carga com a mesma chave é conflito.
    const previous = getDb().orders.find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey)
    if (previous) {
      if (previous.bodyHash !== bodyHash) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada em outro pedido.')
      }
      settleDueOrders()
      return HttpResponse.json(toOrderDto(getDb().orders.find((o) => o.id === previous.id)!))
    }

    const fields: Record<string, string> = {}
    if (input.buyer.fullName.length < 3) fields['buyer.fullName'] = 'Informe o nome completo.'
    if (!EMAIL_PATTERN.test(input.buyer.email)) fields['buyer.email'] = 'Informe um e-mail válido.'
    if (!isNetwork(input.network)) fields.network = 'Selecione uma rede válida.'
    if (!input.walletId) fields.walletId = 'Selecione uma carteira.'
    if (!input.quoteId) fields.quoteId = 'Cotação ausente.'
    if (Object.keys(fields).length) return errors.validation(fields)
    const network = input.network as Order['network']

    const quote = getDb().quotes.find((q) => q.id === input.quoteId && q.ownerKey === `user:${userId}`)
    if (!quote) return errors.notFound('Cotação não encontrada.')
    if (quote.network !== network) return errors.validation({ network: 'A rede difere da cotação.' })

    const wallet = getDb().wallets.find((w) => w.id === input.walletId && w.userId === userId)
    if (!wallet) return errors.notFound('Carteira não encontrada.')
    if (getDb().walletConnections[wallet.id]?.network !== network) {
      return apiError(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira na rede selecionada antes de pagar.')
    }

    const validation = validateQuote(quote)
    if (!validation.ok) return quoteConflict(validation)
    if (!quote.purchasable) {
      const details: QuoteStaleDetails = { quote: toQuoteDto(quote) }
      return apiError(409, 'OUT_OF_STOCK', 'Há itens sem estoque suficiente no carrinho.', { details })
    }

    const scenario = getScenario().name
    const now = Date.now()
    const order = mutate((db) => {
      const record: OrderRecord = {
        id: nextId('ord'),
        userId,
        status: 'pending',
        quoteId: quote.id,
        lines: quote.lines.map(({ available: _available, ...line }) => line),
        coupon: quote.coupon,
        subtotalEth: quote.subtotalEth,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        network,
        wallet: { id: wallet.id, label: wallet.label, address: wallet.address },
        buyer: input.buyer,
        txHash: null,
        explorerUrl: null,
        failureReason: null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        settledAt: null,
        version: 1,
        idempotencyKey,
        bodyHash,
        outcome: scenario === 'payment-declined' ? 'declined' : 'confirmed',
        resolveAt: scenario === 'order-pending' ? null : now + ORDER_SETTLE_MS,
      }
      db.orders.push(record)
      return record
    })
    adjustStock(order.lines, -1)
    scheduleSettlement(order)

    // O pedido já existe: a resposta atrasada força o cliente a recuperar pela mesma chave.
    if (scenario === 'order-timeout') await delay(ORDER_TIMEOUT_DELAY_MS)
    return HttpResponse.json(toOrderDto(getDb().orders.find((o) => o.id === order.id)!), { status: 201 })
  }),

  http.get('/api/orders', ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    settleDueOrders()
    const orders = getDb()
      .orders.filter((o) => o.userId === auth.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrderDto)
    return HttpResponse.json(orders)
  }),

  http.get('/api/orders/:orderId', ({ request, params }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    settleDueOrders()
    // Pedido de outro usuário responde como inexistente, sem revelar que existe.
    const order = getDb().orders.find((o) => o.id === params.orderId && o.userId === auth.user.id)
    if (!order) return errors.notFound('Pedido não encontrado.')
    return HttpResponse.json(toOrderDto(order))
  }),
]
