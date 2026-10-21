import { HttpResponse, http } from 'msw'
import type { CartMergeResult, NftEdition } from '@/types/api'
import { apiError, errors, readJson, requireUser, resolveCartOwner, str } from '../http'
import { findEdition } from '../services/catalog'
import {
  cartItemId,
  checkCoupon,
  deleteCart,
  getCartRecord,
  toCartDto,
  updateCart,
} from '../services/cart'

/** Valida a quantidade total desejada de uma edição no carrinho. */
function quantityProblem(quantity: unknown, edition: NftEdition): Response | null {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
    return errors.validation({ quantity: 'A quantidade deve ser um número inteiro maior que zero.' })
  }
  if (edition.available === 0) {
    return apiError(409, 'OUT_OF_STOCK', `A edição ${edition.name} está esgotada.`, { details: { available: 0 } })
  }
  if (quantity > edition.maxPerOrder) {
    return apiError(422, 'QUANTITY_LIMIT', `Limite de ${edition.maxPerOrder} unidade(s) por pedido nesta edição.`, {
      fields: { quantity: `Máximo de ${edition.maxPerOrder} por pedido.` },
      details: { maxPerOrder: edition.maxPerOrder },
    })
  }
  if (quantity > edition.available) {
    return apiError(409, 'OUT_OF_STOCK', `Restam apenas ${edition.available} unidade(s) disponíveis.`, {
      details: { available: edition.available },
    })
  }
  return null
}

export const cartHandlers = [
  http.get('/api/cart', ({ request }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    return HttpResponse.json(toCartDto(getCartRecord(owner.ownerKey)))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const body = await readJson(request)
    const found = findEdition(str(body?.nftId), str(body?.editionId))
    if (!found) return errors.notFound('NFT ou edição não encontrados.')

    const { nft, edition } = found
    const existing = getCartRecord(owner.ownerKey).items.find((i) => i.nftId === nft.id && i.editionId === edition.id)
    const quantity = body?.quantity
    const total = typeof quantity === 'number' ? (existing?.quantity ?? 0) + quantity : quantity
    const problem = quantityProblem(quantity, edition) ?? quantityProblem(total, edition)
    if (problem) return problem

    const cart = updateCart(owner.ownerKey, (c) => {
      const item = c.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)
      if (item) item.quantity = total as number
      else c.items.push({ nftId: nft.id, editionId: edition.id, quantity: total as number, addedPriceEth: edition.priceEth })
    })
    return HttpResponse.json(toCartDto(cart))
  }),

  http.patch('/api/cart/items/:itemId', async ({ request, params }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const item = getCartRecord(owner.ownerKey).items.find((i) => cartItemId(i.nftId, i.editionId) === params.itemId)
    if (!item) return errors.notFound('Item não está no carrinho.')
    const found = findEdition(item.nftId, item.editionId)
    if (!found) return errors.notFound('NFT ou edição não encontrados.')

    const body = await readJson(request)
    const problem = quantityProblem(body?.quantity, found.edition)
    if (problem) return problem

    const cart = updateCart(owner.ownerKey, (c) => {
      const target = c.items.find((i) => cartItemId(i.nftId, i.editionId) === params.itemId)
      if (target) target.quantity = body!.quantity as number
    })
    return HttpResponse.json(toCartDto(cart))
  }),

  http.delete('/api/cart/items/:itemId', ({ request, params }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const exists = getCartRecord(owner.ownerKey).items.some((i) => cartItemId(i.nftId, i.editionId) === params.itemId)
    if (!exists) return errors.notFound('Item não está no carrinho.')
    const cart = updateCart(owner.ownerKey, (c) => {
      c.items = c.items.filter((i) => cartItemId(i.nftId, i.editionId) !== params.itemId)
      if (c.items.length === 0) c.couponCode = null
    })
    return HttpResponse.json(toCartDto(cart))
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const code = str((await readJson(request))?.code)
    if (!code) return errors.validation({ code: 'Informe o código do cupom.' })
    if (getCartRecord(owner.ownerKey).items.length === 0) {
      return apiError(422, 'CART_EMPTY', 'Adicione itens antes de aplicar um cupom.')
    }

    const check = checkCoupon(code)
    if (!check.ok) {
      const message = check.reason === 'COUPON_EXPIRED' ? 'Este cupom expirou.' : 'Cupom inválido.'
      return apiError(422, check.reason, message, { fields: { code: message } })
    }
    const cart = updateCart(owner.ownerKey, (c) => {
      c.couponCode = check.code
    })
    return HttpResponse.json(toCartDto(cart))
  }),

  http.delete('/api/cart/coupon', ({ request }) => {
    const owner = resolveCartOwner(request)
    if (!owner.ok) return owner.response
    const cart = updateCart(owner.ownerKey, (c) => {
      c.couponCode = null
    })
    return HttpResponse.json(toCartDto(cart))
  }),

  // Ao autenticar, os itens do visitante são incorporados ao carrinho do usuário.
  http.post('/api/cart/merge', async ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const guestId = str((await readJson(request))?.guestId)
    if (!/^[\w-]{8,64}$/.test(guestId)) return errors.validation({ guestId: 'Identificador de visitante inválido.' })

    const guestCart = getCartRecord(`guest:${guestId}`)
    const adjustments: CartMergeResult['adjustments'] = []
    const userKey = `user:${auth.user.id}` as const

    const cart =
      guestCart.items.length === 0
        ? getCartRecord(userKey)
        : updateCart(userKey, (c) => {
            for (const guestItem of guestCart.items) {
              const found = findEdition(guestItem.nftId, guestItem.editionId)
              if (!found) continue
              const { edition } = found
              const item = c.items.find((i) => i.nftId === guestItem.nftId && i.editionId === guestItem.editionId)
              const requested = (item?.quantity ?? 0) + guestItem.quantity
              const applied = Math.min(requested, edition.maxPerOrder, edition.available)
              if (applied !== requested) adjustments.push({ itemId: cartItemId(guestItem.nftId, guestItem.editionId), requested, applied })
              if (item) item.quantity = Math.max(item.quantity, applied)
              else if (applied > 0) c.items.push({ ...guestItem, quantity: applied })
            }
            if (!c.couponCode && guestCart.couponCode) c.couponCode = guestCart.couponCode
          })
    deleteCart(`guest:${guestId}`)

    const result: CartMergeResult = { cart: toCartDto(cart), adjustments }
    return HttpResponse.json(result)
  }),
]
