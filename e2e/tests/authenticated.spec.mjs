import { expect, test } from '@playwright/test'

test.describe('authenticated artist flows', () => {
  test('authenticated session can open the listener home page', async ({ page }) => {
    await page.goto('/home')

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByPlaceholder('アーティスト・楽曲・気分で探す')).toBeVisible()
    await expect(page.getByRole('link', { name: '+ アップロード' })).toBeVisible()
    await expect(page.getByText('楽曲がありません')).toBeVisible()
  })

  test('seeded artist can open the artist dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: '開発者アカウント' })).toBeVisible()
    await expect(page.getByText('アーティストダッシュボード')).toBeVisible()
    await expect(page.getByRole('link', { name: '+ アップロード' })).toBeVisible()
  })

  test('authenticated artist can open the upload screen', async ({ page }) => {
    await page.goto('/upload')

    await expect(page).toHaveURL(/\/upload$/)
    await expect(page.getByRole('heading', { name: '楽曲をアップロード' })).toBeVisible()
    await expect(page.getByText('MP3 / M4A / FLAC / WAV / OGG（最大200MB）')).toBeVisible()
    await expect(page.locator('input[type="file"]').first()).toBeAttached()
  })

  test('storage state survives navigation between private routes', async ({ page }) => {
    await page.goto('/home')
    await page.getByRole('link', { name: 'アーティストの方へ →' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText('アーティストダッシュボード')).toBeVisible()
  })
})
