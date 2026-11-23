import { expect, test as setup } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.resolve(currentDir, '../.auth/artist.json')

const email = 'playwright.artist@example.com'
const password = 'playwright-password-123'

setup('seed and authenticate artist account', async ({ page, request }) => {
  const secret = process.env.E2E_CRON_SECRET
  expect(secret, 'E2E_CRON_SECRET must be configured').toBeTruthy()

  const seedResponse = await request.post('/api/dev/seed-account', {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
    data: { email, password },
  })

  expect(seedResponse.ok(), await seedResponse.text()).toBeTruthy()

  await page.goto('/dev-login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.context().storageState({ path: authFile })
})
