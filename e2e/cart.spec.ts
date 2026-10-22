// Cenário 5: carrinho, quantidades, remoção, cupom e persistência após refresh/login.
import { expect, test, type Page } from '@playwright/test'
import { call } from './support/api.ts'
import { BRUNO, buyFromDetail, cartSummary, formatEth, currentQuote, start, submitLogin, summaryValue } from './support/app.ts'

const nftName = async (page: Page, id: string) => (await call<{ name: string }>(page, `/nfts/${id}`)).body.name
const items = (page: Page) => page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('listitem')

test('5. carrinho: quantidade, remoção, cupom, refresh e merge no login', async ({ page }) => {
  await start(page)
  const [first, second, brunos] = await Promise.all(['nft_001', 'nft_002', 'nft_006'].map((id) => nftName(page, id)))

  // Visitante adiciona dois NFTs.
  await buyFromDetail(page, 'nft_001')
  await buyFromDetail(page, 'nft_002')
  await expect(items(page)).toHaveCount(2)
  const summary = cartSummary(page)

  // Quantidade: o resumo segue a cotação da API.
  const quantity = page.getByRole('group', { name: `Quantidade de ${first}` })
  await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(quantity).toContainText('2')
  let quote = await currentQuote(page)
  await expect(summaryValue(summary, 'Subtotal')).toHaveText(formatEth(quote.subtotalEth))
  await expect(summaryValue(summary, 'Total')).toHaveText(formatEth(quote.totalEth))

  // Remoção.
  await page.getByRole('button', { name: new RegExp(`^Remover ${second} `) }).click()
  await expect(items(page)).toHaveCount(1)
  await expect(page.getByText(second)).toHaveCount(0)

  // Cupom: vazio, inválido, expirado, válido e remoção.
  const coupon = summary.getByRole('textbox', { name: 'Código promocional' })
  const apply = summary.getByRole('button', { name: 'Aplicar' })
  await apply.click()
  await expect(summary.getByText('Informe o código do cupom.')).toBeVisible()
  await expect(coupon).toHaveAccessibleDescription('Informe o código do cupom.')
  await coupon.fill('NAOEXISTE')
  await apply.click()
  await expect(summary.getByRole('alert')).toContainText(/inválido|não encontrado|não existe/i)
  await coupon.fill('summer24')
  await apply.click()
  await expect(summary.getByRole('alert')).toContainText('Este cupom expirou.')
  await coupon.fill('jungle10')
  await apply.click()
  await expect(summary.getByText('Cupom JUNGLE10 aplicado')).toBeVisible()
  quote = await currentQuote(page)
  await expect(summaryValue(summary, 'Cupom JUNGLE10 (10%)')).toHaveText(`(-) ${formatEth(quote.discountEth)}`)
  await expect(summaryValue(summary, 'Total')).toHaveText(formatEth(quote.totalEth))
  await summary.getByRole('button', { name: 'Remover cupom JUNGLE10' }).click()
  await expect(summaryValue(summary, 'Desconto do lançamento')).toHaveText('(-) 0 ETH')
  await coupon.fill('JUNGLE10')
  await apply.click()
  await expect(summary.getByText('Cupom JUNGLE10 aplicado')).toBeVisible()

  // Refresh mantém itens, quantidades e cupom.
  await page.reload()
  await expect(items(page)).toHaveCount(1)
  await expect(page.getByRole('group', { name: `Quantidade de ${first}` })).toContainText('2')
  await expect(cartSummary(page).getByText('Cupom JUNGLE10 aplicado')).toBeVisible()

  // Login: o carrinho do visitante se junta ao do usuário (Bruno já tinha um NFT).
  await page.goto('/entrar?redirect=%2Fcarrinho')
  await submitLogin(page, BRUNO.email)
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(items(page)).toHaveCount(2)
  await expect(page.getByRole('group', { name: `Quantidade de ${first}` })).toContainText('2')
  await expect(page.getByRole('group', { name: `Quantidade de ${brunos}` })).toBeVisible()
  await page.reload()
  await expect(items(page)).toHaveCount(2)
})
