// Cenários 11 e 12: teclado, foco em diálogos, validação; skeletons, falha e nova tentativa.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { mock } from './support/api.ts'
import { ANA, buyFromDetail, cartSummary, isMobile, login, start } from './support/app.ts'

const cards = (page: Page) => page.locator('#produtos a[href^="/nfts/"]')
const focusVisible = (page: Page) => page.evaluate(() => document.activeElement?.matches(':focus-visible') ?? false)

/** Tab várias vezes: o foco nunca sai do diálogo. */
async function expectFocusTrapped(page: Page, dialog: Locator, presses = 15) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
}

test('11. teclado, foco visível, diálogos e validação de formulário', async ({ page }) => {
  await start(page)
  await expect(cards(page)).toHaveCount(9)

  // Primeiro Tab chega a um elemento interativo com foco visível.
  await page.keyboard.press('Tab')
  expect(await focusVisible(page)).toBe(true)

  if (isMobile()) {
    // Drawer de filtros: foco entra, fica preso e volta ao gatilho ao fechar.
    const trigger = page.getByRole('button', { name: 'Filtros', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await expectFocusTrapped(page, drawer)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  } else {
    // Menu de ordenação operado só pelo teclado; o foco volta ao gatilho.
    const trigger = page.getByRole('button', { name: /Ordenar por/ })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeHidden()
    await expect(page).toHaveURL(/sort=/)
    await expect(trigger).toBeFocused()
  }

  // Card navegável por teclado.
  await cards(page).first().focus()
  expect(await focusVisible(page)).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nfts\/nft_/)

  // Diálogo de login: foco inicial no primeiro campo, preso no diálogo, erros associados.
  await page.goto('/entrar')
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await expect(dialog.getByLabel('E-mail')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription(/.+/)
  await expect(dialog.getByLabel('Senha', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expectFocusTrapped(page, dialog)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Checkout: o envio inválido leva o foco ao primeiro campo com erro.
  await login(page, ANA.email)
  await buyFromDetail(page, 'nft_001')
  await page.goto('/checkout')
  // Conectar sem rede/provedor aponta os campos que faltam.
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByLabel('Rede')).toHaveAccessibleDescription('Selecione uma rede.')
  await expect(page.getByText('Escolha como conectar a carteira.')).toBeVisible()
  // Rede, provedor e conexão pelo teclado.
  await page.getByLabel('Rede').focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByLabel('Rede')).not.toHaveValue('')
  await page.getByRole('radio', { name: 'MetaMask' }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Conectar carteira' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/^Conectada:/)).toBeVisible()
  await page.getByLabel('Nome de exibição').fill('')
  await page.getByLabel('E-mail').fill('invalido')
  await page.getByLabel('E-mail').press('Enter')
  await expect(page.getByLabel('Nome de exibição')).toBeFocused()
  await expect(page.getByLabel('E-mail')).toHaveAccessibleDescription('Informe um e-mail válido.')
})

test('12a. skeletons com shimmer em carregamento lento, sem deslocar o layout', async ({ page }) => {
  await start(page, '/', { scenario: 'slow' })
  const grid = page.locator('#produtos')
  const skeleton = grid.locator('[data-slot="skeleton"]:visible').first()
  await expect(skeleton).toBeVisible()
  // Brilho animado no pseudo-elemento.
  expect(await skeleton.evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe('shimmer')
  const placeholder = await grid.locator('[data-slot="skeleton"].aspect-square').first().boundingBox()
  await expect(cards(page)).toHaveCount(9, { timeout: 10_000 })
  await expect(grid.locator('[data-slot="skeleton"]')).toHaveCount(0)
  const image = await cards(page).first().locator('img').first().boundingBox()
  expect(Math.abs(image!.width - placeholder!.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(image!.y - placeholder!.y)).toBeLessThanOrEqual(2)

  // Detalhe e resumo do carrinho também têm skeleton.
  await page.goto('/nfts/nft_001')
  await expect(page.getByLabel('Carregando NFT')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  await mock(page, 'setScenario', 'default')
  await buyFromDetail(page, 'nft_001')
  await mock(page, 'setScenario', 'slow', '/api/quotes')
  await page.reload()
  await expect(cartSummary(page).getByLabel('Calculando resumo')).toBeVisible()
  await expect(cartSummary(page).getByLabel('Calculando resumo')).toHaveCount(0, { timeout: 10_000 })
})

test('12b. movimento reduzido desliga o shimmer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await start(page, '/', { scenario: 'slow' })
  const skeleton = page.locator('#produtos [data-slot="skeleton"]:visible').first()
  await expect(skeleton).toBeVisible()
  expect(await skeleton.evaluate((el) => getComputedStyle(el, '::after').display)).toBe('none')
})

test('12c. falha do catálogo e do detalhe com recuperação por nova tentativa', async ({ page }) => {
  await start(page, '/', { scenario: 'error', target: 'GET /api/nfts' })
  const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs.' })
  await expect(alert).toBeVisible({ timeout: 15_000 })
  await mock(page, 'setScenario', 'default')
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cards(page)).toHaveCount(9)

  await mock(page, 'setScenario', 'offline', 'GET /api/nfts/')
  await page.goto('/nfts/nft_001')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar o NFT' })).toBeVisible({ timeout: 15_000 })
  await mock(page, 'setScenario', 'default')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Não foi possível carregar o NFT')
})
