// Helpers de interface dos testes E2E. Cada teste roda num contexto novo do
// navegador (storage vazio) e abre o app com `?mockReset`, que restaura o seed.
import { expect, test, type Page } from '@playwright/test'
import { PASSWORD } from './api.ts'

export const ANA = { email: 'ana@jungle.dev', name: 'Ana Ribeiro' }
export const BRUNO = { email: 'bruno@jungle.dev', name: 'Bruno Costa' }

export const isMobile = () => test.info().project.name === 'mobile'

/** Abre a rota com o mock restaurado (e, opcionalmente, um cenário). */
export async function start(page: Page, path = '/', params: Record<string, string> = {}) {
  const url = new URL(path, 'http://app')
  url.searchParams.set('mockReset', '')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  await page.goto(`${url.pathname}${url.search}`)
  await page.waitForFunction(() => '__mock' in window)
}

/** Preenche o login (já aberto em /entrar ou no modal) e aguarda o fechamento. */
export async function submitLogin(page: Page, email: string, password = PASSWORD) {
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

/** Entra pela tela de login e volta ao `redirect`. */
export async function login(page: Page, email: string, redirect = '/') {
  await page.goto(`/entrar?redirect=${encodeURIComponent(redirect)}`)
  await submitLogin(page, email)
  await expect(page).toHaveURL(new RegExp(`${redirect.replace(/[/?]/g, '\\$&')}$`))
}

/** Botão de compra do detalhe (desktop: "COMPRAR"; mobile: "Comprar NFT"). */
export const buyButton = (page: Page) => page.getByRole('button', { name: /^comprar( nft)?$/i })

/** Adiciona a edição padrão do NFT ao carrinho pelo detalhe e vai ao carrinho. */
export async function buyFromDetail(page: Page, nftId: string) {
  await page.goto(`/nfts/${nftId}`)
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

/** Resumo do carrinho: o desktop usa a coluna lateral; o mobile, a área de resumo. */
export const cartSummary = (page: Page) =>
  isMobile() ? page.getByLabel('Resumo do pagamento') : page.getByRole('complementary', { name: 'Resumo da carteira' })
