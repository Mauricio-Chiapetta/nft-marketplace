// Contratos do backend simulado, exercitados pelo service worker do MSW.
import { expect, test, type Page } from '@playwright/test'
import { call, login, mock, type ApiErrorBody } from './support/api.ts'

async function open(page: Page, query = '') {
  await page.goto(`/?mockReset${query}`)
  await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
}

test.describe('contratos do mock', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Contratos independem do viewport')
    await open(page)
  })

  test('catálogo: filtros combinados, ordenação, paginação e 404', async ({ page }) => {
    const all = await call<{ total: number; items: unknown[]; totalPages: number }>(page, '/nfts')
    expect(all.body.total).toBe(40)
    expect(all.body.items).toHaveLength(12)
    expect(all.body.totalPages).toBe(4)

    const filtered = await call<{ items: { category: string; totalAvailable: number; priceFromEth: string }[] }>(
      page,
      '/nfts?category=art,music&availability=available&sort=price-asc&pageSize=48',
    )
    expect(filtered.status).toBe(200)
    expect(filtered.body.items.length).toBeGreaterThan(0)
    for (const nft of filtered.body.items) {
      expect(['art', 'music']).toContain(nft.category)
      expect(nft.totalAvailable).toBeGreaterThan(0)
    }
    const prices = filtered.body.items.map((n) => Number(n.priceFromEth))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    const empty = await call<{ total: number }>(page, '/nfts?q=inexistente-xyz')
    expect(empty.body.total).toBe(0)

    const invalid = await call(page, '/nfts?sort=foo')
    expect(invalid.status).toBe(422)

    const detail = await call<{ id: string; editions: unknown[] }>(page, '/nfts/nft_001')
    expect(detail.body.id).toBe('nft_001')
    expect(detail.body.editions.length).toBe(3)

    const missing = await call<ApiErrorBody>(page, '/nfts/nft_999')
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')

    const unknownRoute = await call<ApiErrorBody>(page, '/rota-que-nao-existe')
    expect(unknownRoute.status).toBe(404)
    expect(unknownRoute.body.error.code).toBe('NOT_FOUND')
  })

  test('sessão: credenciais, conflito de cadastro e expiração', async ({ page }) => {
    const wrong = await call<ApiErrorBody>(page, '/auth/login', {
      method: 'POST',
      body: { email: 'ana@jungle.dev', password: 'errada123' },
    })
    expect(wrong.status).toBe(401)
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS')

    const conflict = await call<{ error: { code: string; fields: Record<string, string> } }>(page, '/auth/register', {
      method: 'POST',
      body: { name: 'Outra Ana', email: 'ana@jungle.dev', password: 'Senha1234' },
    })
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.fields.email).toBeTruthy()

    const invalid = await call<{ error: { fields: Record<string, string> } }>(page, '/auth/register', {
      method: 'POST',
      body: { name: 'A', email: 'x', password: '123' },
    })
    expect(invalid.status).toBe(422)
    expect(Object.keys(invalid.body.error.fields).sort()).toEqual(['email', 'name', 'password'])

    const created = await call<{ token: string; user: Record<string, unknown> }>(page, '/auth/register', {
      method: 'POST',
      body: { name: 'Carla Nunes', email: 'carla@jungle.dev', password: 'Senha1234' },
    })
    expect(created.status).toBe(201)
    expect(created.body.user).not.toHaveProperty('passwordHash')

    const token = await login(page, 'ana@jungle.dev')
    expect((await call(page, '/auth/session', { token })).status).toBe(200)

    await mock(page, 'expireSessions')
    const expired = await call<ApiErrorBody>(page, '/auth/session', { token })
    expect(expired.status).toBe(401)
    expect(expired.body.error.code).toBe('SESSION_EXPIRED')
  })

  test('isolamento: um usuário não acessa dados do outro', async ({ page }) => {
    const ana = await login(page, 'ana@jungle.dev')
    const bruno = await login(page, 'bruno@jungle.dev')

    const anaFavs = await call<{ nftIds: string[] }>(page, '/me/favorites', { token: ana })
    const brunoFavs = await call<{ nftIds: string[] }>(page, '/me/favorites', { token: bruno })
    expect(anaFavs.body.nftIds).not.toEqual(brunoFavs.body.nftIds)

    expect((await call(page, '/orders/ord_seed_bruno', { token: ana })).status).toBe(404)
    expect((await call(page, '/orders/ord_seed_ana', { token: ana })).status).toBe(200)
    expect((await call(page, '/me/wallets/wal_bruno_main', { method: 'PATCH', token: ana, body: { label: 'x1' } })).status).toBe(404)
    expect((await call(page, '/me/favorites')).status).toBe(401)

    const anaCart = await call<{ items: unknown[] }>(page, '/cart', { token: ana })
    const brunoCart = await call<{ items: unknown[] }>(page, '/cart', { token: bruno })
    expect(anaCart.body.items).toHaveLength(0)
    expect(brunoCart.body.items).toHaveLength(1)
  })

  test('compra: carrinho do visitante, cupom, cotação, idempotência e liquidação', async ({ page }) => {
    const guest = { 'X-Guest-Id': 'guest-e2e-0001' }
    const added = await call<{ itemCount: number }>(page, '/cart/items', {
      method: 'POST',
      headers: guest,
      body: { nftId: 'nft_001', editionId: 'nft_001-std', quantity: 2 },
    })
    expect(added.body.itemCount).toBe(2)

    const limit = await call<ApiErrorBody>(page, '/cart/items', {
      method: 'POST',
      headers: guest,
      body: { nftId: 'nft_001', editionId: 'nft_001-gen', quantity: 2 },
    })
    expect(limit.body.error.code).toBe('QUANTITY_LIMIT')

    const token = await login(page, 'ana@jungle.dev')
    const merged = await call<{ cart: { itemCount: number } }>(page, '/cart/merge', {
      method: 'POST',
      token,
      body: { guestId: 'guest-e2e-0001' },
    })
    expect(merged.body.cart.itemCount).toBe(2)

    const expired = await call<ApiErrorBody>(page, '/cart/coupon', { method: 'PUT', token, body: { code: 'SUMMER24' } })
    expect(expired.body.error.code).toBe('COUPON_EXPIRED')
    const invalid = await call<ApiErrorBody>(page, '/cart/coupon', { method: 'PUT', token, body: { code: 'NOPE' } })
    expect(invalid.body.error.code).toBe('COUPON_INVALID')
    expect((await call(page, '/cart/coupon', { method: 'PUT', token, body: { code: 'jungle10' } })).status).toBe(200)

    const quote = await call<{ id: string; subtotalEth: string; discountEth: string; totalEth: string; networkFeeEth: string }>(
      page,
      '/quotes',
      { method: 'POST', token, body: { network: 'polygon' } },
    )
    expect(quote.status).toBe(201)
    expect(quote.body.networkFeeEth).toBe('0.0004')

    const order = {
      quoteId: quote.body.id,
      walletId: 'wal_ana_main',
      network: 'polygon',
      buyer: { fullName: 'Ana Ribeiro', email: 'ana@jungle.dev' },
    }
    const key = { 'Idempotency-Key': 'e2e-order-key-1' }

    const notConnected = await call<ApiErrorBody>(page, '/orders', { method: 'POST', token, headers: key, body: order })
    expect(notConnected.body.error.code).toBe('WALLET_NOT_CONNECTED')
    await call(page, '/me/wallets/wal_ana_main/connect', { method: 'POST', token, body: { network: 'polygon' } })

    await mock(page, 'setScenario', 'order-pending')
    const first = await call<{ id: string; status: string; totalEth: string }>(page, '/orders', { method: 'POST', token, headers: key, body: order })
    expect(first.status).toBe(201)
    expect(first.body.status).toBe('pending')
    expect(first.body.totalEth).toBe(quote.body.totalEth)

    const repeat = await call<{ id: string }>(page, '/orders', { method: 'POST', token, headers: key, body: order })
    expect(repeat.status).toBe(200)
    expect(repeat.body.id).toBe(first.body.id)

    const reused = await call<ApiErrorBody>(page, '/orders', {
      method: 'POST',
      token,
      headers: key,
      body: { ...order, network: 'ethereum' },
    })
    expect(reused.status).toBe(409)
    expect(reused.body.error.code).toBe('IDEMPOTENCY_CONFLICT')

    const orderId = first.body.id
    await mock(page, 'settleOrder', orderId, 'confirmed')
    const settled = await call<{ status: string; txHash: string }>(page, `/orders/${orderId}`, { token })
    expect(settled.body.status).toBe('confirmed')
    expect(settled.body.txHash).toMatch(/^0x[0-9a-f]{64}$/)

    const events = await mock<{ type: string; resource: { id: string } }[]>(page, 'recentEvents')
    expect(events.some((e) => e.type === 'order.updated' && e.resource.id === orderId)).toBe(true)

    const cart = await call<{ items: unknown[] }>(page, '/cart', { token })
    expect(cart.body.items).toHaveLength(0)
  })

  test('cotação desatualizada é recusada com a cotação nova', async ({ page }) => {
    const token = await login(page, 'bruno@jungle.dev')
    await call(page, '/me/wallets/wal_bruno_main/connect', { method: 'POST', token, body: { network: 'ethereum' } })
    const quote = await call<{ id: string; totalEth: string }>(page, '/quotes', { method: 'POST', token, body: { network: 'ethereum' } })

    await mock(page, 'updateNft', 'nft_006', [{ editionId: 'nft_006-std', priceEth: '9.5' }])

    const validate = await call<{ error: { code: string; details: { quote: { totalEth: string } } } }>(
      page,
      `/quotes/${quote.body.id}/validate`,
      { method: 'POST', token },
    )
    expect(validate.status).toBe(409)
    expect(validate.body.error.code).toBe('QUOTE_STALE')
    expect(validate.body.error.details.quote.totalEth).not.toBe(quote.body.totalEth)

    const order = await call<ApiErrorBody>(page, '/orders', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': 'e2e-stale-key-1' },
      body: {
        quoteId: quote.body.id,
        walletId: 'wal_bruno_main',
        network: 'ethereum',
        buyer: { fullName: 'Bruno Costa', email: 'bruno@jungle.dev' },
      },
    })
    expect(order.body.error.code).toBe('QUOTE_STALE')
  })

  test('persistência após refresh e reset integral', async ({ page }) => {
    const token = await login(page, 'bruno@jungle.dev')
    await call(page, '/me/favorites/nft_020', { method: 'PUT', token })

    await page.reload()
    await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
    const after = await call<{ nftIds: string[] }>(page, '/me/favorites', { token })
    expect(after.body.nftIds).toContain('nft_020')

    await mock(page, 'reset')
    expect((await call(page, '/me/favorites', { token })).status).toBe(401)
    const fresh = await login(page, 'bruno@jungle.dev')
    const reset = await call<{ nftIds: string[] }>(page, '/me/favorites', { token: fresh })
    expect(reset.body.nftIds).toEqual(['nft_002', 'nft_010'])
  })

  test('cenários de rede selecionados pela URL, com alvo', async ({ page }) => {
    await open(page, '&scenario=error&target=/nfts')
    const failed = await call<ApiErrorBody>(page, '/nfts')
    expect(failed.status).toBe(500)
    expect(failed.body.error.code).toBe('INTERNAL_ERROR')
    expect((await call(page, '/health')).status).toBe(200)

    await mock(page, 'setScenario', 'default')
    expect((await call(page, '/nfts')).status).toBe(200)
  })
})
