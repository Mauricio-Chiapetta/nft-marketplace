import { expect, test } from '@playwright/test'

test('app sobe e responde pelo mock', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFT Marketplace' })).toBeVisible()
  await expect(page.getByTestId('api-status')).toHaveText(/ok/)
})
