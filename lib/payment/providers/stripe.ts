import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import type {
  PaymentProvider,
  CustomerParams,
  OneTimeChargeParams,
  OneTimeChargeResult,
  SubscriptionCheckoutParams,
  BillingPortalParams,
  PendingInvoiceItemParams,
  InvoiceItemLookupParams,
  ProviderInvoiceItem,
  NormalizedWebhookEvent,
} from '../types'
import { WebhookVerificationError } from '../types'

// Stripeの生APIをPaymentProvider共通形式に正規化するアダプタ（v3.4第3章）
export class StripeAdapter implements PaymentProvider {
  readonly name = 'stripe'

  async createCustomer(params: CustomerParams): Promise<{ customerId: string }> {
    const customer = await stripe.customers.create({ metadata: params.metadata })
    return { customerId: customer.id }
  }

  async createOneTimeCharge(params: OneTimeChargeParams): Promise<OneTimeChargeResult> {
    const pi = await stripe.paymentIntents.create({
      amount: params.amountYen,
      currency: 'jpy',
      customer: params.customerId,
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
    })
    return { providerChargeId: pi.id, clientSecret: pi.client_secret }
  }

  async createSubscriptionCheckout(params: SubscriptionCheckoutParams): Promise<{ url: string | null }> {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: { metadata: params.metadata },
    })
    return { url: session.url }
  }

  async createBillingPortalSession(params: BillingPortalParams): Promise<{ url: string | null }> {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    })
    return { url: session.url }
  }

  async createPendingInvoiceItem(params: PendingInvoiceItemParams): Promise<{ invoiceItemId: string }> {
    const item = await stripe.invoiceItems.create(
      {
        customer: params.customerId,
        amount: params.amountYen,
        currency: 'jpy',
        description: params.description,
        metadata: params.metadata,
        ...(params.discountable !== undefined ? { discountable: params.discountable } : {}),
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined
    )
    return { invoiceItemId: item.id }
  }

  async findInvoiceItem(
    params: InvoiceItemLookupParams
  ): Promise<{ invoiceItemId: string } | null> {
    // pendingだけに限定すると、DB保存前の障害後に既にinvoiceへ取り込まれた項目を
    // 復元できないため、顧客のinvoice item全体から不変なmetadataで探す。
    let matchedInvoiceItemId: string | null = null

    for await (const item of stripe.invoiceItems.list({
      customer: params.customerId,
      limit: 100,
    })) {
      if (item.metadata?.[params.metadataKey] !== params.metadataValue) continue

      if (matchedInvoiceItemId && matchedInvoiceItemId !== item.id) {
        // 同じ不変batchに複数の請求項目がある場合は二重請求の可能性があるため、
        // どちらかを推測せずfail-closedにする。
        throw new Error(`Duplicate invoice items detected for ${params.metadataKey}=${params.metadataValue}`)
      }

      matchedInvoiceItemId = item.id
    }

    return matchedInvoiceItemId ? { invoiceItemId: matchedInvoiceItemId } : null
  }

  async listInvoiceItems(providerInvoiceId: string): Promise<ProviderInvoiceItem[]> {
    const result: ProviderInvoiceItem[] = []

    // Webhook内のinvoice.linesは省略される場合があるため、Stripe APIから全件取得する。
    for await (const item of stripe.invoiceItems.list({
      invoice: providerInvoiceId,
      limit: 100,
    })) {
      const customerId =
        typeof item.customer === 'string' ? item.customer : item.customer?.id ?? null

      result.push({
        providerInvoiceItemId: item.id,
        amountYen: item.amount,
        currency: item.currency.toUpperCase(),
        customerId,
        metadata: item.metadata ?? {},
      })
    }

    return result
  }

  verifyAndNormalizeWebhook(rawBody: string, signature: string | null): NormalizedWebhookEvent {
    if (!signature) {
      throw new WebhookVerificationError('No signature')
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      throw new WebhookVerificationError('Webhook signature verification failed')
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const plan = session.metadata?.plan
        if (!userId || !plan) return { kind: 'ignored' }
        return { kind: 'checkout_completed', userId, plan }
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        const plan = sub.metadata?.plan
        if (!userId || !plan) return { kind: 'ignored' }
        const active = sub.status === 'active' || sub.status === 'trialing'
        return { kind: 'subscription_updated', userId, plan, active }
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) return { kind: 'ignored' }
        return { kind: 'subscription_deleted', userId }
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        return {
          kind: 'charge_succeeded',
          providerChargeId: pi.id,
          metadata: pi.metadata ?? {},
        }
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        return {
          kind: 'invoice_paid',
          providerEventId: event.id,
          providerInvoiceId: invoice.id,
        }
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        return {
          kind: 'invoice_payment_failed',
          providerEventId: event.id,
          providerInvoiceId: invoice.id,
        }
      }
      default:
        return { kind: 'ignored' }
    }
  }
}
