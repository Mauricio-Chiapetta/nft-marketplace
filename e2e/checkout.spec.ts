// Cenários 6 e 7: compra completa e falhas do pedido (recusa, clique repetido, timeout).
import { expect, test } from '@playwright/test'
import { mock } from './support/api.ts'
import { ANA, buyButton, start, submitLogin, summaryValue } from './support/app.ts'
import { anaOrders, anaWithCart, openReview } from './support/checkout.ts'

test('6. compra completa, do catálogo ao recibo confirmado', async ({ page }) => {
  // Relógio controlado: a liquidação (4 s no mock) é adiantada pelo teste.
  await page.clock.install()
  await start(page)
  await page.locator('#produtos a[href^="/nfts/"]').first().click()
  await expect(page).toHaveURL(/\/nfts\//)
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  // Checkout exige sessão: login no meio do fluxo e retomada no checkout.
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fcheckout/)
  await submitLogin(page, ANA.email)
  await expect(page).toHaveURL(/\/checkout$/)

  // Validação dos campos do layout antes da revisão.
  await page.getByLabel('Nome de exibição').fill('')
  await page.getByLabel('Rede').selectOption('ethereum')
  await page.locator('label', { hasText: 'MetaMask' }).click()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/^Conectada:/)).toBeVisible()
  await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
  await expect(page.getByLabel('Nome de exibição')).toHaveAccessibleDescription('Informe o nome completo.')
  await expect(page.getByLabel('Nome de exibição')).toBeFocused()
  await page.getByLabel('Nome de exibição').fill('Ana Ribeiro')

  const dialog = await openReview(page)
  const total = await summaryValue(dialog, 'Total').innerText()
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click()

  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toBeVisible()
  await page.clock.runFor(5000)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  const receipt = page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })
  await expect(receipt).toBeVisible()
  await expect(summaryValue(receipt, 'Total')).toHaveText(total)
  await expect(summaryValue(receipt, 'ID da transação')).toHaveText(/^0x/)
  await expect(summaryValue(receipt, 'Carteira')).toHaveText('Carteira principal')

  // Itens comprados saem do carrinho.
  await receipt.getByRole('button', { name: 'Fechar' }).click()
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()

  // O recibo é snapshot: mudar o catálogo depois não altera os valores.
  const [order] = await anaOrders(page)
  const nftId = (await mock<{ orders: { id: string; lines: { nftId: string; editionId: string }[] }[] }>(page, 'snapshot'))
    .orders.find((o) => o.id === order.id)!.lines[0]
  await mock(page, 'updateNft', nftId.nftId, [{ editionId: nftId.editionId, priceEth: '42' }])
  await page.goto(`/pedidos/${order.id}`)
  await expect(summaryValue(page.getByRole('dialog'), 'Total')).toHaveText(total)
  expect(await anaOrders(page)).toHaveLength(1)
})

test('7a. pagamento recusado preserva os itens', async ({ page }) => {
  await anaWithCart(page, 'nft_001', 'payment-declined')
  const dialog = await openReview(page)
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 10_000 })
  // Sem confirmação para pedido recusado.
  await expect(page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('listitem')).toHaveCount(1)
})

test('7b. clique repetido cria um único pedido', async ({ page }) => {
  await anaWithCart(page, 'nft_001', 'order-pending')
  const dialog = await openReview(page)
  const confirm = dialog.getByRole('button', { name: 'Confirmar compra' })
  await confirm.dblclick()
  await confirm.click({ force: true, timeout: 1000 }).catch(() => {})
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toBeVisible()
  expect(await anaOrders(page)).toHaveLength(1)
})

test('7c. timeout após criar o pedido recupera o mesmo pedido', async ({ page }) => {
  // O mock só responde depois do timeout do Axios (10 s); o relógio adianta a espera.
  await page.clock.install()
  await anaWithCart(page, 'nft_001', 'order-timeout')
  const dialog = await openReview(page)
  const created = page.waitForRequest((r) => r.url().endsWith('/api/orders') && r.method() === 'POST')
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
  const first = await created
  const retry = page.waitForRequest((r) => r.url().endsWith('/api/orders') && r.method() === 'POST')
  await page.clock.runFor(10_500)
  // Reenvio automático com a mesma chave de idempotência.
  expect((await retry).headers()['idempotency-key']).toBe(first.headers()['idempotency-key'])
  await page.clock.runFor(13_000)
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  const orders = await anaOrders(page)
  expect(orders).toHaveLength(1)
  expect(orders[0].idempotencyKey).toBe(first.headers()['idempotency-key'])
})
