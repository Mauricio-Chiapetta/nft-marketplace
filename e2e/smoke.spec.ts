import { expect, test } from '@playwright/test'

test('app sobe e lista NFTs pelo mock', async ({ page }) => {
  await page.goto('/?mockReset')
  await expect(page.getByRole('heading', { name: /SEJA DONO DO FUTURO/ })).toBeVisible()
  await expect(page.locator('#produtos a[href^="/nfts/"]')).toHaveCount(9)
})
