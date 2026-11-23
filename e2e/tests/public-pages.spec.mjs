import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('landing page exposes the primary public navigation', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('聴くことが、そのまま')
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible()
    await expect(page.getByRole('link', { name: '無料で始める' }).first()).toBeVisible()
  })

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'RESON' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
  })

  test('register page is reachable from the public app', async ({ page }) => {
    await page.goto('/register')

    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByRole('heading', { name: 'RESON' })).toBeVisible()
  })

  test('privacy page renders without private-service credentials', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.getByRole('heading', { name: '個人データの取扱い' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '運営者と連絡先' })).toBeVisible()
  })

  test('landing page login link navigates to the login page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'ログイン' }).click()

    await expect(page).toHaveURL(/\/login$/)
  })


  test('language switcher moves between Japanese and English routes', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: '英語に切り替える' }).click()
    await expect(page).toHaveURL(/\/en\/?$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listening should')

    await page.getByRole('link', { name: 'Switch to Japanese' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('聴くことが、そのまま')
  })

  test('English locale renders translated landing and auth navigation', async ({ page }) => {
    await page.goto('/en')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listening should')
    await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/en/login')

    await page.getByRole('link', { name: 'Log in' }).click()
    await expect(page).toHaveURL(/\/en\/login$/)
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  })

  test('default locale prefix redirects to the canonical prefixless URL', async ({ page }) => {
    await page.goto('/ja/login')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('middleware applies baseline security headers to public pages', async ({ request }) => {
    const response = await request.get('/')

    expect(response.status()).toBe(200)
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect(response.headers()['x-frame-options']).toBe('DENY')
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
})
