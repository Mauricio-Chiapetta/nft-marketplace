import { ethAdd, ethMul, ethPercent, ethSub } from '@/lib/eth'
import type { Cart, CartItem, Network, Quote, QuoteIssue, QuoteLine } from '@/types/api'
import { NETWORK_FEES } from '../data/fixtures'
import { getDb, mutate, nextId, type CartRecord, type OwnerKey, type QuoteRecord } from '../db'
import { findEdition } from './catalog'

export const QUOTE_TTL_MS = 5 * 60_000

export function cartItemId(nftId: string, editionId: string) {
  return `${nftId}:${editionId}`
}

function emptyCart(ownerKey: OwnerKey): CartRecord {
  return {
    id: `cart_${ownerKey.replace(':', '_')}`,
    items: [],
    couponCode: null,
    version: 0,
    updatedAt: new Date(0).toISOString(),
  }
}

export function getCartRecord(ownerKey: OwnerKey): CartRecord {
  return getDb().carts[ownerKey] ?? emptyCart(ownerKey)
}

/** Aplica uma alteração ao carrinho do dono, criando-o se preciso, e incrementa a versão. */
export function updateCart(ownerKey: OwnerKey, fn: (cart: CartRecord) => void): CartRecord {
  return mutate((db) => {
    const cart = db.carts[ownerKey] ?? emptyCart(ownerKey)
    fn(cart)
    cart.version += 1
    cart.updatedAt = new Date().toISOString()
    db.carts[ownerKey] = cart
    return cart
  })
}

export function deleteCart(ownerKey: OwnerKey) {
  mutate((db) => {
    delete db.carts[ownerKey]
  })
}

export function toCartDto(record: CartRecord): Cart {
  const items: CartItem[] = []
  for (const item of record.items) {
    const found = findEdition(item.nftId, item.editionId)
    if (!found) continue
    const { nft, edition } = found
    items.push({
      id: cartItemId(nft.id, edition.id),
      nftId: nft.id,
      editionId: edition.id,
      nftName: nft.name,
      editionName: edition.name,
      image: nft.images[0],
      quantity: item.quantity,
      unitPriceEth: edition.priceEth,
      addedPriceEth: item.addedPriceEth,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      nftVersion: nft.version,
    })
  }
  return {
    id: record.id,
    items,
    couponCode: record.couponCode,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    version: record.version,
    updatedAt: record.updatedAt,
  }
}

export type CouponCheck =
  | { ok: true; code: string; percentOff: number }
  | { ok: false; reason: 'COUPON_INVALID' | 'COUPON_EXPIRED' }

export function checkCoupon(code: string): CouponCheck {
  const coupon = getDb().coupons.find((c) => c.code === code.trim().toUpperCase())
  if (!coupon) return { ok: false, reason: 'COUPON_INVALID' }
  if (Date.parse(coupon.expiresAt) <= Date.now()) return { ok: false, reason: 'COUPON_EXPIRED' }
  return { ok: true, code: coupon.code, percentOff: coupon.percentOff }
}

/** Calcula a cotação a partir do estado atual do carrinho e do catálogo. */
export function computeQuote(ownerKey: OwnerKey, network: Network): Omit<QuoteRecord, 'id' | 'createdAt' | 'expiresAt'> {
  const cart = toCartDto(getCartRecord(ownerKey))
  const lines: QuoteLine[] = cart.items.map((item) => ({
    itemId: item.id,
    nftId: item.nftId,
    editionId: item.editionId,
    nftName: item.nftName,
    editionName: item.editionName,
    image: item.image,
    quantity: item.quantity,
    unitPriceEth: item.unitPriceEth,
    lineTotalEth: ethMul(item.unitPriceEth, item.quantity),
    available: item.available,
    nftVersion: item.nftVersion,
  }))

  const issues: QuoteIssue[] = []
  for (const line of lines) {
    if (line.available === 0) {
      issues.push({ itemId: line.itemId, code: 'SOLD_OUT', message: `${line.nftName} (${line.editionName}) esgotou.`, available: 0 })
    } else if (line.quantity > line.available) {
      issues.push({
        itemId: line.itemId,
        code: 'INSUFFICIENT_STOCK',
        message: `Restam apenas ${line.available} unidade(s) de ${line.nftName} (${line.editionName}).`,
        available: line.available,
      })
    }
  }

  const couponCheck = cart.couponCode ? checkCoupon(cart.couponCode) : null
  const coupon = couponCheck?.ok ? { code: couponCheck.code, percentOff: couponCheck.percentOff } : null

  const subtotalEth = lines.length ? ethAdd(...lines.map((l) => l.lineTotalEth)) : '0'
  const discountEth = coupon ? ethPercent(subtotalEth, coupon.percentOff) : '0'
  const networkFeeEth = lines.length ? NETWORK_FEES[network] : '0'
  const totalEth = ethAdd(ethSub(subtotalEth, discountEth), networkFeeEth)

  const fingerprint = JSON.stringify({
    lines: lines.map((l) => [l.itemId, l.quantity, l.unitPriceEth, l.nftVersion]),
    coupon: coupon?.code ?? null,
    network,
    networkFeeEth,
  })

  return {
    ownerKey,
    fingerprint,
    network,
    lines,
    coupon,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    issues,
    purchasable: lines.length > 0 && issues.length === 0,
    cartVersion: cart.version,
  }
}

export function createQuote(ownerKey: OwnerKey, network: Network): QuoteRecord {
  const computed = computeQuote(ownerKey, network)
  return mutate((db) => {
    const now = Date.now()
    const quote: QuoteRecord = {
      id: nextId('quo'),
      ...computed,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    }
    // Mantém só as cotações recentes de cada dono.
    const others = db.quotes.filter((q) => q.ownerKey !== ownerKey)
    const own = db.quotes.filter((q) => q.ownerKey === ownerKey).slice(-4)
    db.quotes = [...others, ...own, quote]
    return quote
  })
}

export function toQuoteDto(record: QuoteRecord): Quote {
  const { ownerKey: _owner, fingerprint: _fp, ...quote } = record
  return quote
}

export type QuoteValidation =
  | { ok: true; quote: QuoteRecord }
  | { ok: false; code: 'QUOTE_STALE' | 'QUOTE_EXPIRED'; fresh: QuoteRecord }

/** Confere se a cotação ainda corresponde ao carrinho e ao catálogo atuais. */
export function validateQuote(quote: QuoteRecord): QuoteValidation {
  if (Date.parse(quote.expiresAt) <= Date.now()) {
    return { ok: false, code: 'QUOTE_EXPIRED', fresh: createQuote(quote.ownerKey, quote.network) }
  }
  const current = computeQuote(quote.ownerKey, quote.network)
  if (current.fingerprint !== quote.fingerprint) {
    return { ok: false, code: 'QUOTE_STALE', fresh: createQuote(quote.ownerKey, quote.network) }
  }
  return { ok: true, quote }
}
