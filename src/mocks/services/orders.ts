import type { Order, OrderLine } from '@/types/api'
import { EXPLORERS } from '../data/fixtures'
import { getDb, mutate, nextEventId, type OrderRecord } from '../db'
import { publish } from '../events'
import { updateCart } from './cart'
import { findNft, updateNftEditions } from './catalog'

export const ORDER_SETTLE_MS = 4000

const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Hash de transação simulado, derivado do id do pedido (determinístico). */
export function txHashFor(orderId: string): string {
  let hex = ''
  for (let round = 0; hex.length < 64; round++) {
    let h = 0x811c9dc5 ^ round
    for (const ch of `${orderId}#${round}`) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 0x01000193)
    }
    hex += (h >>> 0).toString(16).padStart(8, '0')
  }
  return `0x${hex.slice(0, 64)}`
}

export function toOrderDto(record: OrderRecord): Order {
  const { userId: _u, idempotencyKey: _k, bodyHash: _b, outcome: _o, resolveAt: _r, ...order } = record
  return order
}

/** Devolve (1) ou reserva (-1) estoque das linhas, com um evento por NFT. */
export function adjustStock(lines: OrderLine[], direction: 1 | -1) {
  const byNft = new Map<string, OrderLine[]>()
  for (const line of lines) byNft.set(line.nftId, [...(byNft.get(line.nftId) ?? []), line])
  for (const [nftId, nftLines] of byNft) {
    const nft = findNft(nftId)
    if (!nft) continue
    updateNftEditions(
      nftId,
      nftLines.map((line) => {
        const edition = nft.editions.find((e) => e.id === line.editionId)
        return { editionId: line.editionId, available: (edition?.available ?? 0) + direction * line.quantity }
      }),
    )
  }
}

/**
 * Leva um pedido pendente ao estado terminal. Pedidos confirmados ou recusados
 * não mudam mais; chamadas repetidas são inofensivas.
 */
export function settleOrder(orderId: string, outcome?: 'confirmed' | 'declined'): OrderRecord | null {
  const existing = getDb().orders.find((o) => o.id === orderId)
  if (!existing) return null
  clearTimeout(timers.get(orderId))
  timers.delete(orderId)
  if (existing.status !== 'pending') return existing

  const finalOutcome = outcome ?? existing.outcome
  const order = mutate((db) => {
    const record = db.orders.find((o) => o.id === orderId)!
    const now = new Date().toISOString()
    record.status = finalOutcome
    record.settledAt = now
    record.updatedAt = now
    record.resolveAt = null
    record.version += 1
    if (finalOutcome === 'confirmed') {
      record.txHash = txHashFor(record.id)
      record.explorerUrl = `${EXPLORERS[record.network]}${record.txHash}`
    } else {
      record.failureReason = 'Pagamento recusado pela carteira.'
    }
    return record
  })

  if (finalOutcome === 'declined') {
    adjustStock(order.lines, 1)
  } else {
    // Remove do carrinho apenas os itens e quantidades comprados.
    updateCart(`user:${order.userId}`, (cart) => {
      for (const line of order.lines) {
        const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
        if (item) item.quantity -= line.quantity
      }
      cart.items = cart.items.filter((i) => i.quantity > 0)
      if (cart.items.length === 0) cart.couponCode = null
    })
  }

  const eventId = mutate(() => nextEventId())
  publish({
    id: eventId,
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: order.updatedAt,
    data: {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      txHash: order.txHash,
      explorerUrl: order.explorerUrl,
      failureReason: order.failureReason,
      settledAt: order.settledAt,
    },
  })
  return order
}

export function scheduleSettlement(order: OrderRecord) {
  if (order.status !== 'pending' || order.resolveAt === null) return
  clearTimeout(timers.get(order.id))
  const wait = Math.max(0, order.resolveAt - Date.now())
  timers.set(order.id, setTimeout(() => settleOrder(order.id), wait))
}

/** Liquida pedidos vencidos (ex.: a aba ficou fechada) antes de respondê-los. */
export function settleDueOrders() {
  const now = Date.now()
  for (const order of getDb().orders) {
    if (order.status === 'pending' && order.resolveAt !== null && order.resolveAt <= now) settleOrder(order.id)
  }
}

/** Rearma os timers de pedidos pendentes após recarregar a página. */
export function armPendingOrders() {
  settleDueOrders()
  for (const order of getDb().orders) scheduleSettlement(order)
}

export function clearSettlementTimers() {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}
