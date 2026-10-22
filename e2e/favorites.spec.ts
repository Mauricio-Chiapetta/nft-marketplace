// Cenário 4: favoritos otimistas, falha da mutation com rollback e persistência.
import { expect, test, type Page } from '@playwright/test'
import { mock } from './support/api.ts'
import { ANA, BRUNO, login, logout, start } from './support/app.ts'

// Desktop: "Favoritar"/"Favoritado"; mobile: ícone "Favoritar: <nome>"/"Remover dos favoritos: <nome>".
// O primeiro é o do detalhe; no mobile, os cards de "mais da coleção" também têm o ícone.
const favorite = (page: Page) => page.getByRole('button', { name: /^(Favoritar|Favoritado|Remover dos favoritos)/ }).first()

/** Clica e espera a resposta da API (um refresh antes dela cancelaria a mutation). */
async function toggle(page: Page) {
  const response = page.waitForResponse((r) => r.url().includes('/api/me/favorites/'))
  await favorite(page).click()
  await response
}

test('4. favoritos: visitante, otimista, falha com rollback e persistência por usuário', async ({ page }) => {
  await start(page, '/nfts/nft_002')
  await favorite(page).click()
  await expect(page.getByText('Entre para salvar seus favoritos.')).toBeVisible()

  await login(page, ANA.email, '/nfts/nft_001')
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')

  // Sucesso: estado otimista e persistido após refresh.
  await page.goto('/nfts/nft_002')
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')
  await toggle(page)
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')

  // Falha: a UI reage na hora e volta ao estado anterior quando a API recusa.
  await mock(page, 'setScenario', 'slow', 'PUT /me/favorites')
  await page.goto('/nfts/nft_004')
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')
  const slowPut = page.waitForResponse((r) => r.url().includes('/api/me/favorites/nft_004') && r.request().method() === 'PUT')
  await favorite(page).click()
  // Marcado antes da resposta (2,5 s de latência).
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 })
  await slowPut
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')
  await mock(page, 'setScenario', 'error', 'PUT /me/favorites')
  await favorite(page).click() // remove (DELETE, sem falha)
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')
  await favorite(page).click() // favorita (PUT com 500)
  await expect(page.getByText('Não foi possível favoritar. Tente novamente.')).toBeVisible()
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')

  // Recuperação: nova tentativa com a API de volta.
  await mock(page, 'setScenario', 'default')
  await toggle(page)
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')

  // Favoritos são por usuário.
  await logout(page)
  await login(page, BRUNO.email, '/nfts/nft_001')
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'false')
  await page.goto('/nfts/nft_002')
  await expect(favorite(page)).toHaveAttribute('aria-pressed', 'true')
})
