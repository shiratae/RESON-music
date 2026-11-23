import { isEdJpEmail, generateVerificationCode, hashVerificationCode, codeExpiresAt, isCodeExpired } from '@/lib/student/verify'

describe('isEdJpEmail', () => {
  test('.ed.jp なら true', () => {
    expect(isEdJpEmail('student@school.ed.jp')).toBe(true)
    expect(isEdJpEmail('student@sub.school.ed.jp')).toBe(true)
  })

  test('.ed.jp 以外は false', () => {
    expect(isEdJpEmail('student@gmail.com')).toBe(false)
    expect(isEdJpEmail('student@school.ac.jp')).toBe(false)
    expect(isEdJpEmail('not-an-email')).toBe(false)
  })
})

describe('generateVerificationCode', () => {
  test('6桁の数字文字列を返す', () => {
    const code = generateVerificationCode()
    expect(code).toMatch(/^\d{6}$/)
  })
})

describe('hashVerificationCode', () => {
  test('認証コードを一方向ハッシュに変換する', () => {
    expect(hashVerificationCode('123456')).toHaveLength(64)
    expect(hashVerificationCode('123456')).not.toBe('123456')
    expect(hashVerificationCode('123456')).toBe(hashVerificationCode('123456'))
  })
})

describe('codeExpiresAt / isCodeExpired', () => {
  test('発行から10分後に期限切れになる', () => {
    const now = new Date('2026-06-30T00:00:00Z')
    const expiresAt = codeExpiresAt(now)
    expect(isCodeExpired(expiresAt, new Date('2026-06-30T00:09:00Z'))).toBe(false)
    expect(isCodeExpired(expiresAt, new Date('2026-06-30T00:11:00Z'))).toBe(true)
  })
})
