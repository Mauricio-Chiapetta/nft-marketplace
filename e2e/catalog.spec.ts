// Cenários 1 e 2: catálogo na URL e acesso direto ao detalhe.
import { expect, test, type Page } from '@playwright/test'
import { buyButton, isMobile, start } from './support/app.ts'

const cards = (page: Page) => page.locator('#produtos a[href^="/nfts/"]')
const param = (url: string, name: string) => new URL(url).searchParams.get(name)
const expectParam = (page: Page, name: string, value: string) =>
  expect.poll(() => param(page.url(), name)).toBe(value)

/** Filtros ficam na lateral no desktop e no drawer no mobile. */
async function toggleCategory(page: Page, label: string) {
  if (isMobile()) {
    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await drawer.getByRole('checkbox', { name: label }).click()
    await drawer.getByRole('button', { name: 'Fechar filtros' }).click()
    await expect(drawer).toBeHidden()
  } else {
    await page.getByRole('checkbox', { name: label }).click()
  }
}

test('1. busca, filtros combinados, ordenação, paginação e histórico', async ({ page }) => {
  await start(page)
  await expect(cards(page)).toHaveCount(9)

  // Filtros combinados: a requisição leva os dois valores e a página volta à 1.
  await page.goto('/?page=2')
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
  await toggleCategory(page, 'Arte')
  await expect(page).toHaveURL(/category=art/)
  await expect(page).not.toHaveURL(/page=/)
  const request = page.waitForRequest((r) => r.url().includes('/api/nfts?') && param(r.url(), 'category') === 'art,music')
  await toggleCategory(page, 'Música')
  await request
  await expectParam(page, 'category', 'art,music')

  // Ordenação por menor preço.
  await page.getByRole('button', { name: /Ordenar por/ }).click()
  await page.getByRole('menuitemradio', { name: 'Menor preço' }).click()
  await expect(page).toHaveURL(/sort=price-asc/)
  const prices = async () =>
    (await cards(page).allInnerTexts()).map((t) => Number(/([\d.,]+)\s*ETH/.exec(t)?.[1].replace(',', '.')))
  await expect.poll(async () => {
    const list = await prices()
    return list.length > 0 && list.every((p, i) => i === 0 || p >= list[i - 1])
  }).toBe(true)
  const firstPage = await cards(page).first().getAttribute('href')

  // Paginação.
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(cards(page).first()).not.toHaveAttribute('href', firstPage!)

  // Refresh mantém o estado; o histórico restaura os passos anteriores.
  await page.reload()
  await expectParam(page, 'category', 'art,music')
  await expectParam(page, 'sort', 'price-asc')
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
  await page.goBack()
  await expect(page).not.toHaveURL(/page=2/)
  await expect(cards(page).first()).toHaveAttribute('href', firstPage!)
  await page.goBack()
  await expect(page).not.toHaveURL(/sort=/)
  await page.goForward()
  await expect(page).toHaveURL(/sort=price-asc/)

  // Busca textual compõe a URL e trata resultado vazio.
  await page.goto('/?q=inexistente-xyz')
  await expect(page.getByText('Nenhum NFT encontrado com esses critérios.')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(cards(page)).toHaveCount(9)
})

test('1b. busca pelo campo do layout atualiza a URL', async ({ page }) => {
  await start(page)
  // Debounce: só a busca final chega à API.
  const request = page.waitForRequest((r) => r.url().includes('/api/nfts?') && param(r.url(), 'q') === 'Emerald')
  if (isMobile()) {
    await page.getByPlaceholder('Explorar coleções').pressSequentially('Emerald')
  } else {
    await page.getByRole('button', { name: 'Buscar' }).click()
    await page.getByPlaceholder('Buscar NFTs, coleções ou criadores').pressSequentially('Emerald')
  }
  await request
  await expectParam(page, 'q', 'Emerald')
  await expect(page.getByText('Resultados para')).toBeVisible()
  // Enquanto a resposta não chega, a lista anterior segue como placeholder.
  await expect.poll(async () => {
    const texts = await cards(page).allInnerTexts()
    return texts.length > 0 && texts.every((t) => /Emerald/i.test(t))
  }).toBe(true)
})

test('2. acesso direto ao detalhe, inexistente, edição esgotada e limite', async ({ page }) => {
  await start(page, '/nfts/nft_003')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Edição esgotada fica marcada e bloqueia a compra.
  const gold = page.getByRole('radio', { name: /^Gold · 0\// })
  await gold.click()
  await expect(gold).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: /esgotado/i })).toBeDisabled()

  // Limite por pedido: Standard aceita no máximo 5.
  await page.getByRole('radio', { name: /^Standard/ }).click()
  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  for (let i = 0; i < 4; i++) await plus.click()
  await expect(page.getByRole('status', { name: 'Quantidade' })).toHaveText('5')
  await expect(plus).toBeDisabled()
  await expect(buyButton(page)).toBeEnabled()

  await page.goto('/nfts/nft_999')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()

  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})
