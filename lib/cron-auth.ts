import { timingSafeEqual } from 'crypto'

/**
 * Cron/service endpoints must never authenticate when their shared secret is
 * missing.  Keeping this check in one place prevents a future endpoint from
 * accidentally accepting `Authorization: Bearer undefined`.
 */
export function hasValidCronAuthorization(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !authHeader) return false

  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(authHeader)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
