// Regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile).
// Dados estáveis: seed do mock restaurado, relógio fixo, fontes e imagens carregadas.
import { expect, test, type Page } from '@playwright/test'
import { ANA, buyFromDetail, login, start } from './support/app.ts'

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0)
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0)
  // Imagens decodificadas (inclusive as lazy, abaixo da dobra).
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) img.loading = 'eager'
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)))
  })
}

const shot = (page: Page, name: string) =>
  expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    // Toasts dependem do tempo de exibição.
    mask: [page.locator('[data-sonner-toaster]')],
  })

test.describe('regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-20T12:00:00-03:00'))
  })

  test('início', async ({ page }) => {
    await start(page)
    await settle(page)
    await shot(page, 'inicio')
  })

  test('detalhe', async ({ page }) => {
    await start(page, '/nfts/nft_001')
    await settle(page)
    await shot(page, 'detalhe')
  })

  test('carrinho', async ({ page }) => {
    await start(page)
    await buyFromDetail(page, 'nft_001')
    await buyFromDetail(page, 'nft_002')
    await settle(page)
    await shot(page, 'carrinho')
  })

  test('pagamento', async ({ page }) => {
    await start(page)
    await login(page, ANA.email)
    await buyFromDetail(page, 'nft_001')
    await page.goto('/checkout')
    await expect(page.getByRole('button', { name: 'Revisar e confirmar compra' })).toBeVisible()
    await settle(page)
    await shot(page, 'pagamento')
  })
})
