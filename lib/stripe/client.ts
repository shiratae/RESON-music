import Stripe from 'stripe'

let stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient

  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  stripeClient = new Stripe(apiKey, {
    apiVersion: '2026-06-24.dahlia',
  })

  return stripeClient
}

// Keep the existing `stripe.*` API while deferring client construction until a
// Stripe operation is actually used. Next.js imports route modules during
// `next build`, so eager construction would require production secrets in CI.
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const client = getStripeClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export type PlanId = 'standard' | 'student' | 'support_plus'

export const PLAN_PRICE_IDS: Record<PlanId, string> = {
  standard: process.env.STRIPE_PRICE_STANDARD!,
  student: process.env.STRIPE_PRICE_STUDENT!,
  support_plus: process.env.STRIPE_PRICE_SUPPORT_PLUS!,
}

export const PLAN_LABELS: Record<PlanId, string> = {
  standard: 'Standard',
  student: 'Student',
  support_plus: 'Support+',
}

export const PLAN_AMOUNTS: Record<PlanId, number> = {
  standard: 750,
  student: 250,
  support_plus: 1000,
}
