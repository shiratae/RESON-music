import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const targets = [
  {
    name: 'home',
    path: '/home',
    ready: (page) => page.getByPlaceholder('アーティスト・楽曲・気分で探す'),
  },
  {
    name: 'profile',
    path: '/profile',
    ready: (page) => page.getByRole('heading', { name: '音楽人格・プロフィール' }),
  },
  {
    name: 'pricing',
    path: '/pricing',
    ready: (page) => page.getByRole('heading', { name: '料金プラン' }),
  },
  {
    name: 'privacy-requests',
    path: '/privacy-requests',
    ready: (page) => page.getByRole('heading', { name: '個人データに関する請求' }),
    screenshotOptions: { maxDiffPixelRatio: 0.015 },
  },
  {
    name: 'messages',
    path: '/messages',
    ready: (page) => page.getByRole('heading', { name: 'メッセージ' }),
  },
  {
    name: 'upload',
    path: '/upload',
    ready: (page) => page.getByRole('heading', { name: '楽曲をアップロード' }),
    stabilize: async (page) => {
      await expect(page.getByText('ジャンルタグ（最大3個）')).toBeVisible()
    },
  },
]

test.describe('mobile visual smoke', () => {
  for (const target of targets) {
    test(`${target.name} matches the mobile visual baseline`, async ({ page }) => {
      await page.goto(target.path)
      await expect(target.ready(page)).toBeVisible()
      if (target.stabilize) await target.stabilize(page)
      await page.evaluate(() => document.fonts.ready)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
          }
        `,
      })

      const layout = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth
        const offenders = Array.from(document.querySelectorAll('*'))
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              tag: element.tagName.toLowerCase(),
              className: typeof element.className === 'string' ? element.className : '',
              text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            }
          })
          .filter((item) => item.right > clientWidth + 1 || item.left < -1)
          .sort((a, b) => b.right - a.right)
          .slice(0, 12)

        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth,
          offenders,
        }
      })

      if (layout.scrollWidth > layout.clientWidth) {
        console.log('Horizontal overflow diagnostics:', JSON.stringify(layout, null, 2))
      }

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)

      await mkdir('visual-artifacts', { recursive: true })
      await page.screenshot({
        path: `visual-artifacts/${target.name}-mobile.png`,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
      })

      await expect(page).toHaveScreenshot(`${target.name}-mobile.png`, {
        fullPage: false,
        ...target.screenshotOptions,
      })
    })
  }
})
