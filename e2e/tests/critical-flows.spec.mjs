import { expect, test } from '@playwright/test'

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function makeSilentWav(durationSeconds = 1, sampleRate = 8000) {
  const channels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const sampleCount = durationSeconds * sampleRate
  const dataSize = sampleCount * channels * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28)
  buffer.writeUInt16LE(channels * bytesPerSample, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  return buffer
}

test.describe('critical mocked browser flows', () => {
  test('creates a playlist from the playlist screen', async ({ page }) => {
    const playlists = []

    await page.route('**/api/playlists**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.pathname !== '/api/playlists') return route.fallback()

      if (request.method() === 'GET') {
        return json(route, { playlists })
      }

      if (request.method() === 'POST') {
        const payload = request.postDataJSON()
        playlists.unshift({
          id: 'playlist-e2e',
          title: payload.title,
          is_public: true,
          updated_at: new Date().toISOString(),
        })
        return json(route, { playlist: playlists[0] })
      }

      return route.fallback()
    })

    await page.goto('/playlists')
    await expect(page.getByText('まだプレイリストがありません')).toBeVisible()

    await page.getByPlaceholder('新しいプレイリスト名').fill('Phase 3 Mix')
    await page.getByRole('button', { name: '作成' }).click()

    await expect(page.getByRole('link', { name: 'Phase 3 Mix' })).toBeVisible()
  })

  test('switches playlist tracks and records a heart support request', async ({ page }) => {
    let supportPayload = null
    const wav = makeSilentWav()

    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (url.pathname === '/api/playlists/playlist-e2e' && request.method() === 'GET') {
        return json(route, {
          playlist: {
            id: 'playlist-e2e',
            user_id: 'user-e2e',
            title: 'Phase 3 Mix',
            is_public: true,
          },
          is_owner: true,
          tracks: [
            {
              position: 1,
              track_id: 'track-one',
              tracks: {
                id: 'track-one',
                title: 'First Track',
                duration_sec: 1,
                ai_generated: false,
                artists: { id: 'artist-e2e', name: 'E2E Artist' },
              },
            },
            {
              position: 2,
              track_id: 'track-two',
              tracks: {
                id: 'track-two',
                title: 'Second Track',
                duration_sec: 1,
                ai_generated: false,
                artists: { id: 'artist-e2e', name: 'E2E Artist' },
              },
            },
          ],
        })
      }

      if (url.pathname === '/api/boost' && request.method() === 'GET') {
        return json(route, { used: 0, remaining: 23, free_remaining: 3, price_yen: 30 })
      }

      if (url.pathname.endsWith('/support-graph')) {
        return json(route, {
          supporters: [{ user_id: 'listener-e2e', display_name: 'Phase3 Listener' }],
          total_support_count: 1,
        })
      }

      if (url.pathname.endsWith('/stream')) {
        return route.fulfill({
          status: 200,
          contentType: 'audio/wav',
          body: wav,
        })
      }

      if (url.pathname === '/api/supports' && request.method() === 'POST') {
        supportPayload = request.postDataJSON()
        return json(route, { ok: true, type: 'heart' })
      }

      return route.fallback()
    })

    await page.goto('/playlists/detail?id=playlist-e2e')

    const player = page.locator('audio').first().locator('xpath=..')
    await expect(player.getByText('First Track', { exact: true })).toBeVisible()
    await expect(page.getByText(/Phase3 Listener.*応援しています/)).toBeVisible()

    await page.getByTitle('次の曲').click()
    await expect(player.getByText('Second Track', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /❤️ 応援$/ }).click()
    await expect(page.getByRole('button', { name: /❤️ 応援しました/ })).toBeVisible()
    expect(supportPayload).toEqual({ track_id: 'track-two' })
  })

  test('starts Standard checkout without contacting Stripe', async ({ page }) => {
    let checkoutPayload = null

    await page.route('**/api/stripe/checkout', async (route) => {
      checkoutPayload = route.request().postDataJSON()
      return json(route, { url: '/pricing?success=1' })
    })

    await page.goto('/pricing')
    await page.getByRole('button', { name: 'Standard に登録' }).click()

    await expect(page).toHaveURL(/\/pricing\?success=1$/)
    await expect(page.getByText('サブスクリプションの登録が完了しました')).toBeVisible()
    expect(checkoutPayload).toEqual({ plan: 'standard' })
  })

  test('completes the Student verification UI before mocked checkout', async ({ page }) => {
    let requestPayload = null
    let confirmPayload = null
    let checkoutPayload = null

    await page.route('**/api/student/verify/request', async (route) => {
      requestPayload = route.request().postDataJSON()
      return json(route, { ok: true })
    })

    await page.route('**/api/student/verify/confirm', async (route) => {
      confirmPayload = route.request().postDataJSON()
      return json(route, { ok: true })
    })

    await page.route('**/api/stripe/checkout', async (route) => {
      checkoutPayload = route.request().postDataJSON()
      return json(route, { url: '/pricing?success=1' })
    })

    await page.goto('/pricing')
    await page.getByRole('button', { name: 'Student に登録' }).click()

    await page.getByPlaceholder('example@school.ed.jp').fill('student@example.ed.jp')
    await page.getByRole('button', { name: '認証コードを送信' }).click()

    await page.getByPlaceholder('6桁のコード').fill('123456')
    await page.getByRole('button', { name: '確認して登録へ進む' }).click()

    await expect(page).toHaveURL(/\/pricing\?success=1$/)
    expect(requestPayload).toEqual({ school_email: 'student@example.ed.jp' })
    expect(confirmPayload).toEqual({ code: '123456' })
    expect(checkoutPayload).toEqual({ plan: 'student' })
  })

  test('validates audio type and creates an album through the upload UI', async ({ page }) => {
    const albums = []
    let albumPayload = null

    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (url.pathname === '/api/genres') {
        return json(route, {
          genres: [
            { id: 'genre-pop', name: 'Pop', parent_id: null },
            { id: 'genre-rock', name: 'Rock', parent_id: null },
          ],
        })
      }

      if (url.pathname === '/api/albums' && request.method() === 'GET') {
        return json(route, { albums })
      }

      if (url.pathname === '/api/albums' && request.method() === 'POST') {
        albumPayload = request.postDataJSON()
        const album = {
          id: 'album-e2e',
          title: albumPayload.title,
          release_type: albumPayload.release_type,
          cover_r2_key: null,
          released_at: null,
        }
        albums.push(album)
        return json(route, { album })
      }

      return route.fallback()
    })

    await page.goto('/upload')

    const audioInput = page.locator('input[type="file"]').first()
    await audioInput.setInputFiles({
      name: 'not-audio.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not audio'),
    })

    await expect(page.getByText('対応形式: MP3 / M4A / FLAC / WAV / OGG')).toBeVisible()

    await page.getByPlaceholder('新しいアルバム名').fill('Phase 3 Album')
    await page.getByRole('button', { name: '作成' }).click()

    await expect(page.locator('#track-album')).toContainText('Phase 3 Album')
    expect(albumPayload).toEqual({ title: 'Phase 3 Album', release_type: 'album' })
  })

  test('uploads a valid WAV through mocked R2 and validation services', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Audio decoding upload flow is covered on Chromium; other projects cover the surrounding UI.')

    let uploadMetadata = null
    let r2PutSeen = false
    let aiPayload = null
    let fingerprintPayload = null

    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (url.pathname === '/api/genres') return json(route, { genres: [] })
      if (url.pathname === '/api/albums' && request.method() === 'GET') return json(route, { albums: [] })

      if (url.pathname === '/api/tracks/upload-url' && request.method() === 'POST') {
        uploadMetadata = request.postDataJSON()
        return json(route, {
          track_id: 'track-upload-e2e',
          upload_url: 'http://127.0.0.1:3000/e2e-r2-upload',
          r2_key: 'e2e/track-upload-e2e.wav',
        })
      }

      if (url.pathname === '/api/tracks/ai-check' && request.method() === 'POST') {
        aiPayload = request.postDataJSON()
        return json(route, {
          ok: true,
          ai_generated: false,
          reason: 'not_detected',
          message: '',
        })
      }

      if (url.pathname === '/api/tracks/fingerprint' && request.method() === 'POST') {
        fingerprintPayload = request.postDataJSON()
        return json(route, { ok: true, acoustid_matched: false })
      }

      return route.fallback()
    })

    await page.route('**/e2e-r2-upload', async (route) => {
      r2PutSeen = route.request().method() === 'PUT'
      return route.fulfill({ status: 200, body: '' })
    })

    await page.goto('/upload')

    const audioInput = page.locator('input[type="file"]').first()
    await audioInput.setInputFiles({
      name: 'phase3.wav',
      mimeType: 'audio/wav',
      buffer: makeSilentWav(),
    })

    await expect(page.locator('form input[type="text"]').first()).toHaveValue('phase3')
    await page.locator('input[type="checkbox"][required]').check()
    await page.getByRole('button', { name: 'アップロード' }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })

    expect(uploadMetadata).toMatchObject({
      content_type: 'audio/wav',
      title: 'phase3',
      duration_sec: 1,
      ai_generated: false,
      genre_ids: [],
    })
    expect(r2PutSeen).toBe(true)
    expect(aiPayload).toEqual({ track_id: 'track-upload-e2e', self_declared: false })
    expect(fingerprintPayload.track_id).toBe('track-upload-e2e')
    expect(fingerprintPayload.duration_sec).toBe(1)
    expect(fingerprintPayload.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })
})
