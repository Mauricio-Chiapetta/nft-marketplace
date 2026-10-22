// Helpers de interface dos testes E2E. Cada teste roda num contexto novo do
// navegador (storage vazio) e abre o app com `?mockReset`, que restaura o seed.
import { expect, test, type Locator, type Page } from '@playwright/test'
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
  // Mock pronto e service worker controlando a página (senão o fetch do teste não é interceptado).
  await page.waitForFunction(() => '__mock' in window && Boolean(navigator.serviceWorker.controller))
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
  await expect(page).toHaveURL(new RegExp(`${escape(redirect)}$`))
}

/** Sai pelo menu do usuário (desktop) ou pela aba da conta (mobile, sem header). */
export async function logout(page: Page) {
  if (isMobile()) {
    if (!/\/(perfil|carteiras)$/.test(new URL(page.url()).pathname)) await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
  } else {
    await page.getByRole('button', { name: /^Conta de / }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
  }
  await expect(page.getByRole('link', { name: 'Entrar', exact: true }).first()).toBeVisible()
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
  isMobile() ? page.getByRole('region', { name: 'Resumo do pagamento' }) : page.getByRole('complementary', { name: 'Resumo da carteira' })

/** Valor (dd) de uma linha do resumo pelo rótulo exato (dt). */
export const summaryValue = (scope: Locator, label: string) =>
  scope
    .locator('dl div')
    .filter({ has: scope.page().locator('dt', { hasText: new RegExp(`^${escape(label)}$`) }) })
    .locator('dd')
    .last()

export interface QuoteBody {
  id: string
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  purchasable: boolean
}

/**
 * Cotação atual do carrinho pela API, com a mesma identidade do app (sessão ou
 * visitante). Espera o resumo sair de `aria-busy` antes de consultar.
 */
export async function currentQuote(page: Page, network = 'ethereum') {
  await expect(page.locator('dl[aria-busy="true"]')).toHaveCount(0)
  return page.evaluate(async (network) => {
    const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null') as { token: string } | null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session) headers.Authorization = `Bearer ${session.token}`
    else headers['X-Guest-Id'] = localStorage.getItem('kurio.guestId') ?? ''
    const response = await fetch('/api/quotes', { method: 'POST', headers, body: JSON.stringify({ network }) })
    return response.json()
  }, network) as Promise<QuoteBody>
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** Mesmo formato da interface (src/lib/eth.ts). */
export { formatEth } from '../../src/lib/eth.ts'
