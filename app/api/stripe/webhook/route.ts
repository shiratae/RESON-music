import { paymentProvider, WebhookVerificationError, type ProviderInvoiceItem } from '@/lib/payment'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const KNOWN_PLANS = new Set(['free', 'standard', 'student', 'support_plus'])

// Webhook は冪等に実装（同一イベントが複数回届く前提）。プロバイダ依存の検証/正規化はlib/payment層に集約
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let normalized
  try {
    normalized = paymentProvider.verifyAndNormalizeWebhook(body, sig)
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    throw e
  }

  const supabase = await createServiceClient()

  switch (normalized.kind) {
    case 'checkout_completed':
      await handleCheckoutCompleted(supabase, normalized.userId, normalized.plan)
      break
    case 'subscription_updated':
      await handleSubscriptionUpdated(supabase, normalized.userId, normalized.plan, normalized.active)
      break
    case 'subscription_deleted':
      await handleSubscriptionDeleted(supabase, normalized.userId)
      break
    case 'charge_succeeded':
      if (normalized.metadata.type === 'boost') {
        await handleBoostSucceeded(supabase, normalized.providerChargeId, normalized.metadata)
      } else {
        await handleTipSucceeded(supabase, normalized.providerChargeId, normalized.metadata)
      }
      break
    case 'invoice_paid':
      await handleSupportPlusInvoicePaid(
        supabase,
        normalized.providerEventId,
        normalized.providerInvoiceId
      )
      break
    case 'invoice_payment_failed':
      await handleSupportPlusInvoicePaymentFailed(
        supabase,
        normalized.providerEventId,
        normalized.providerInvoiceId
      )
      break
    case 'ignored':
    default:
      // 未処理イベントは無視（200を返して再送させない）
      break
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  plan: string
) {
  await supabase
    .from('users')
    .update({ plan })
    .eq('id', userId)
}

async function handleSubscriptionUpdated(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  plan: string,
  active: boolean
) {
  // active / trialing のみプランを維持。それ以外は free に戻す
  const newPlan = active ? plan : 'free'

  await supabase
    .from('users')
    .update({ plan: newPlan })
    .eq('id', userId)
}

async function handleSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string
) {
  await supabase
    .from('users')
    .update({ plan: 'free' })
    .eq('id', userId)
}

async function handleTipSucceeded(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  providerChargeId: string,
  metadata: Record<string, string>
) {
  const { track_id, user_id, net_yen, track_plays_at_support } = metadata
  if (!track_id || !user_id || !net_yen) return

  // 今回のPRでは既存の単発投げ銭をledger移行しない。
  // 過去に既に残高反映済みのPaymentIntentが再送された場合、ledger未登録を理由に
  // 再加算すると二重計上になるため、従来どおりpayment_idの存在で終了する。
  const { data: existing } = await supabase
    .from('supports')
    .select('id')
    .eq('payment_id', providerChargeId)
    .single()
  if (existing) return

  const planAtSupport = metadata.plan && KNOWN_PLANS.has(metadata.plan) ? metadata.plan : null
  const { error: insertError } = await supabase.from('supports').insert({
    track_id,
    user_id,
    amount_yen: Number(net_yen),
    payment_id: providerChargeId,
    track_plays_at_support: track_plays_at_support ? Number(track_plays_at_support) : null,
    plan_at_support: planAtSupport,
    funding_status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  })
  if (insertError?.code === '23505') return
  if (insertError) throw insertError

  // Support+のdeferred tipは通常PaymentIntentを作らない。既存互換用にsnapshotで判定する。
  if (planAtSupport === 'support_plus') return

  const { data: track } = await supabase.from('tracks').select('artist_id').eq('id', track_id).single()
  if (!track) return

  await supabase.rpc('add_artist_balance', {
    p_artist_id: track.artist_id,
    p_amount: Number(net_yen),
  })
}

type SupportPlusInvoiceRef = {
  batchId: string
  invoiceItemId: string
  amountYen: number
  currency: string
  customerId: string | null
}

export function supportPlusBatchRefs(invoiceItems: ProviderInvoiceItem[]): SupportPlusInvoiceRef[] {
  const byBatch = new Map<string, SupportPlusInvoiceRef>()

  for (const item of invoiceItems) {
    if (item.metadata.type !== 'support_plus_batch') continue
    const batchId = item.metadata.support_plus_batch_id
    if (!batchId) continue

    const existing = byBatch.get(batchId)
    if (existing && existing.invoiceItemId !== item.providerInvoiceItemId) {
      // 同じ不変batchに複数の請求項目が存在する場合は二重請求の可能性があるため、
      // どちらかを推測せずfail-closedにする。
      throw new Error(`Duplicate Support+ invoice items detected for batch ${batchId}`)
    }

    byBatch.set(batchId, {
      batchId,
      invoiceItemId: item.providerInvoiceItemId,
      amountYen: item.amountYen,
      currency: item.currency,
      customerId: item.customerId,
    })
  }

  return [...byBatch.values()]
}

async function handleSupportPlusInvoicePaid(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  providerEventId: string,
  providerInvoiceId: string
) {
  // Webhook内のinvoice.linesは省略される場合があるため、provider APIから全件取得する。
  const invoiceItems = await paymentProvider.listInvoiceItems(providerInvoiceId)

  for (const ref of supportPlusBatchRefs(invoiceItems)) {
    // 1回のRPC transactionで、決済証跡・provider請求項目・金額・通貨・顧客を検証し、
    // confirmed -> settlement -> ledger credit -> balance cache更新まで処理する。
    const { error } = await supabase.rpc('confirm_support_plus_billing', {
      p_batch_id: ref.batchId,
      p_stripe_invoice_item_id: ref.invoiceItemId,
      p_stripe_invoice_id: providerInvoiceId,
      p_provider_event_id: providerEventId,
      p_provider_amount_yen: ref.amountYen,
      p_provider_currency: ref.currency,
      p_stripe_customer_id: ref.customerId,
    })
    if (error) throw error
  }
}

async function handleSupportPlusInvoicePaymentFailed(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  providerEventId: string,
  providerInvoiceId: string
) {
  const invoiceItems = await paymentProvider.listInvoiceItems(providerInvoiceId)

  for (const ref of supportPlusBatchRefs(invoiceItems)) {
    const { error } = await supabase.rpc('mark_support_plus_billing_failed', {
      p_batch_id: ref.batchId,
      p_stripe_invoice_item_id: ref.invoiceItemId,
      p_stripe_invoice_id: providerInvoiceId,
      p_provider_event_id: providerEventId,
      p_provider_amount_yen: ref.amountYen,
      p_provider_currency: ref.currency,
      p_stripe_customer_id: ref.customerId,
    })
    if (error) throw error
  }
}

const BOOST_ARTIST_SHARE = 0.7 // 21円（70%）。残り30%は運営取得（投げ銭より高め）

async function handleBoostSucceeded(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  providerChargeId: string,
  metadata: Record<string, string>
) {
  const { track_id, user_id, year_month } = metadata
  if (!track_id || !user_id || !year_month) return

  // 冪等: payment_id で重複チェック
  const { data: existing } = await supabase
    .from('boost_hearts')
    .select('id')
    .eq('payment_id', providerChargeId)
    .single()
  if (existing) return

  const { error: insertError } = await supabase.from('boost_hearts').insert({
    track_id,
    user_id,
    year_month,
    amount_yen: 30,
    payment_id: providerChargeId,
    billed: true,
  })
  if (insertError?.code === '23505') return
  if (insertError) throw insertError

  const { data: track } = await supabase.from('tracks').select('artist_id').eq('id', track_id).single()
  if (!track) return

  // ブースト課金は月額プール按分を経由せず、アーティストへ直接送金（投げ銭と同方式）
  await supabase.rpc('add_artist_balance', {
    p_artist_id: track.artist_id,
    p_amount: 30 * BOOST_ARTIST_SHARE,
  })
}
