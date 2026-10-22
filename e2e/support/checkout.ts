// Passos do checkout reaproveitados pelos cenários de compra e tempo real.
import { expect, type Page } from '@playwright/test'
import { mock } from './api.ts'
import { ANA, buyFromDetail, login, start } from './app.ts'

interface DbSnapshot {
  orders: { id: string; userId: string; status: string; idempotencyKey: string }[]
}

/** Pedidos da Ana no DB do mock (o seed já tem um confirmado). */
export async function anaOrders(page: Page) {
  const db = await mock<DbSnapshot>(page, 'snapshot')
  return db.orders.filter((o) => o.userId === 'usr_ana' && !o.idempotencyKey.startsWith('seed-'))
}

/** Ana logada com um NFT no carrinho. */
export async function anaWithCart(page: Page, nftId = 'nft_001', scenario?: string) {
  await start(page, '/', scenario ? { scenario } : {})
  await login(page, ANA.email)
  await buyFromDetail(page, nftId)
}

/** Preenche rede e provedor, conecta a carteira principal e abre a revisão. */
export async function openReview(page: Page) {
  await page.goto('/checkout')
  await page.getByLabel('Rede').selectOption('ethereum')
  await page.locator('label', { hasText: 'MetaMask' }).click()
  // A conexão é do servidor: pode já existir de uma tentativa anterior.
  const connected = page.getByText(/^Conectada:/)
  if (!(await connected.isVisible())) await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(connected).toBeVisible()
  await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revisar pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}
