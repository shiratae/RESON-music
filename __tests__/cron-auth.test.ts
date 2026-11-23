import { hasValidCronAuthorization } from '@/lib/cron-auth'

describe('hasValidCronAuthorization', () => {
  const originalSecret = process.env.CRON_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
  })

  test('CRON_SECRETが未設定なら必ず拒否する', () => {
    delete process.env.CRON_SECRET
    expect(hasValidCronAuthorization('Bearer undefined')).toBe(false)
    expect(hasValidCronAuthorization(null)).toBe(false)
  })

  test('設定済みのBearerトークンだけを許可する', () => {
    process.env.CRON_SECRET = 'test-secret'
    expect(hasValidCronAuthorization('Bearer test-secret')).toBe(true)
    expect(hasValidCronAuthorization('Bearer wrong-secret')).toBe(false)
  })
})
