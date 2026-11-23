import { createHash, randomInt } from 'crypto'

// Studentプラン（.ed.jp認証）の純粋ロジック（テスト対象）

export function isEdJpEmail(email: string): boolean {
  return /^[^\s@]+@([a-zA-Z0-9-]+\.)*ed\.jp$/.test(email)
}

export function generateVerificationCode(): string {
  // Math.random is not suitable for an authentication challenge.
  return String(randomInt(100000, 1_000_000))
}

export function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

const CODE_TTL_MINUTES = 10

export function codeExpiresAt(now: Date): Date {
  return new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000)
}

export function isCodeExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() > expiresAt.getTime()
}

export const MAX_VERIFY_ATTEMPTS = 5
