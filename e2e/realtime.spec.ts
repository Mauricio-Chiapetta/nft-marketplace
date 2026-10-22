// Cenários 9 e 10: eventos Socket.IO (via socket.io-client e o servidor simulado
// no MSW), duplicatas e versões antigas, queda de conexão e pedido pendente.
import { expect, test, type Page } from '@playwright/test'
import { mock } from './support/api.ts'
import { cartSummary, currentQuote, formatEth, summaryValue } from './support/app.ts'
import { anaOrders, anaWithCart, openReview } from './support/checkout.ts'

interface NftEvent {
  id: string
  type: string
  version: number
  data: { nftId: string }
}

/** O app está conectado ao servidor Socket.IO simulado. */
const connected = (page: Page) => expect.poll(() => mock<number>(page, 'realtimeClients'), { timeout: 15_000 }).toBeGreaterThan(0)

test('9. preço e estoque mudam via Socket.IO durante o checkout', async ({ page }) => {
  await anaWithCart(page, 'nft_001')
  await connected(page)

  // No carrinho: aviso acessível e resumo recalculado.
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', priceEth: '0.5' }])
  await expect(page.getByText(/agora custa 0\.5 ETH\./)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /Preço atualizado: era .*, agora 0\.5 ETH\./ })).toBeVisible()
  const quote = await currentQuote(page)
  await expect(summaryValue(cartSummary(page), 'Subtotal')).toHaveText(formatEth(quote.subtotalEth))

  // Esgotado em tempo real bloqueia o avanço; voltar o estoque libera.
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', available: 0 }])
  await expect(cartSummary(page).getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', available: 10 }])
  await expect(cartSummary(page).getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()

  // Com a revisão aberta, o preço muda: o envio é recusado e exige aceitar os novos valores.
  const dialog = await openReview(page)
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', priceEth: '0.7' }])
  const confirm = dialog.getByRole('button', { name: 'Confirmar compra' })
  await confirm.click()
  await expect(dialog.getByText('Preço, disponibilidade ou taxas mudaram desde a última cotação.')).toBeVisible()
  await expect(confirm).toBeDisabled()
  expect(await anaOrders(page)).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
  await expect(summaryValue(dialog, 'Subtotal')).toHaveText('0.7 ETH')
  await confirm.click()
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  expect(await anaOrders(page)).toHaveLength(1)
})

test('10. duplicatas, eventos antigos, queda de conexão e retomada do pedido pendente', async ({ page }) => {
  await anaWithCart(page, 'nft_001', 'order-pending')
  await connected(page)

  // Duas versões publicadas; reenviar a antiga e a duplicada não regride o preço.
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', priceEth: '0.3' }])
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', priceEth: '0.4' }])
  const item = page.getByRole('list', { name: 'Itens do carrinho' })
  await expect(item.getByText('0.4 ETH').first()).toBeVisible()
  const events = (await mock<NftEvent[]>(page, 'recentEvents')).filter((e) => e.type === 'nft.updated')
  const older = events.find((e) => e.version === Math.min(...events.map((x) => x.version)))!
  const newest = events.find((e) => e.version === Math.max(...events.map((x) => x.version)))!
  // Registra se o preço antigo chega a aparecer, mesmo que por um instante.
  await page.evaluate(() => {
    const w = window as unknown as { __regressed: boolean }
    w.__regressed = false
    new MutationObserver(() => {
      if (document.body.innerText.includes('0.3 ETH')) w.__regressed = true
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  await mock(page, 'replayEvent', older)
  await mock(page, 'replayEvent', newest)
  // O socket entrega em ordem: quando o 0.45 aparece, os reenvios já foram processados.
  await mock(page, 'updateNft', 'nft_001', [{ editionId: 'nft_001-std', priceEth: '0.45' }])
  await expect(item.getByText('0.45 ETH').first()).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __regressed: boolean }).__regressed)).toBe(false)

  // Pedido pendente; a conexão cai e o pedido é liquidado enquanto o cliente está fora.
  const dialog = await openReview(page)
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toBeVisible()
  const [order] = await anaOrders(page)
  await mock(page, 'setRealtimeOnline', false)
  await expect.poll(() => mock<number>(page, 'realtimeClients')).toBe(0)
  await mock(page, 'settleOrder', order.id, 'confirmed')

  // Ao reconectar, o cliente reconcilia com a REST e mostra o estado final.
  await mock(page, 'setRealtimeOnline', true)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 20_000 })

  // Terminal: eventos antigos do pedido não o fazem voltar a pendente.
  const orderEvents = (await mock<NftEvent[]>(page, 'recentEvents')).filter((e) => e.type === 'order.updated')
  for (const event of orderEvents) await mock(page, 'replayEvent', event)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toHaveCount(0)
  expect(await anaOrders(page)).toHaveLength(1)
})

test('10b. refresh com pedido pendente recupera o estado sem nova compra', async ({ page }) => {
  await anaWithCart(page, 'nft_001', 'order-pending')
  const dialog = await openReview(page)
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toBeVisible()
  const [order] = await anaOrders(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação na rede' })).toBeVisible()
  await connected(page)
  // Liquidação chega pelo socket com a página aberta.
  await mock(page, 'settleOrder', order.id, 'declined')
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  expect(await anaOrders(page)).toHaveLength(1)
})
