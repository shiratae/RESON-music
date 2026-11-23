import type { SupabaseClient } from '@supabase/supabase-js'
import { paymentProvider } from '@/lib/payment'

type PreparedBatch = {
  batch_id: string
  user_id: string
  gross_tips_yen: number | string
  currency: string
}

export type SupportPlusBillingResult = {
  prepared: number
  invoiceItemsCreated: number
  invoiceItemsRecovered: number
}

/**
 * Support+ の billing_period は既存の created_at 集計と合わせてUTC基準とする。
 * 対象月がまだ終了していない間は請求batchを固定しない。
 */
export function isClosedSupportPlusBillingPeriod(yearMonth: string, now = new Date()): boolean {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const periodEndUtc = Date.UTC(year, month, 1)
  return now.getTime() >= periodEndUtc
}

function asSafePositiveYen(value: number | string): number {
  const amount = Number(value)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`Invalid Support+ billing amount: ${String(value)}`)
  }
  return amount
}

/**
 * 未回収のSupport+投げ銭をユーザー単位の月次batchへ固定し、
 * batchごとにStripeのpending invoice itemを1件作成する。
 *
 * 障害復旧は2段階で行う。
 * 1. 不変なbatch metadataから既存invoice itemを検索する。
 *    既にinvoiceへ取り込まれた項目も対象にする。
 * 2. 新規作成が必要な場合も同じStripe idempotency keyを使う。
 */
export async function prepareSupportPlusBilling(
  supabase: SupabaseClient,
  yearMonth: string
): Promise<SupportPlusBillingResult> {
  if (!isClosedSupportPlusBillingPeriod(yearMonth)) {
    throw new Error(`Support+ billing period ${yearMonth} is not closed yet`)
  }

  const { data, error } = await supabase.rpc('prepare_support_plus_billing', {
    p_year_month: yearMonth,
  })
  if (error) throw new Error(`Support+ billing preparation failed: ${error.message}`)

  const batches = (data ?? []) as PreparedBatch[]
  if (batches.length === 0) {
    return { prepared: 0, invoiceItemsCreated: 0, invoiceItemsRecovered: 0 }
  }

  const userIds = [...new Set(batches.map((batch) => batch.user_id))]
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, stripe_customer_id')
    .in('id', userIds)

  if (usersError) {
    throw new Error(`Support+ Stripe customer lookup failed: ${usersError.message}`)
  }

  const customerByUser = new Map(
    (users ?? []).map((user: { id: string; stripe_customer_id?: string | null }) => [
      user.id,
      user.stripe_customer_id ?? null,
    ])
  )

  let invoiceItemsCreated = 0
  let invoiceItemsRecovered = 0

  for (const batch of batches) {
    const customerId = customerByUser.get(batch.user_id)
    if (!customerId) {
      throw new Error(`Support+ user ${batch.user_id} has no Stripe customer`)
    }

    const amountYen = asSafePositiveYen(batch.gross_tips_yen)
    const recovered = await paymentProvider.findInvoiceItem({
      customerId,
      metadataKey: 'support_plus_batch_id',
      metadataValue: batch.batch_id,
    })

    let invoiceItemId: string
    if (recovered) {
      invoiceItemId = recovered.invoiceItemId
      invoiceItemsRecovered += 1
    } else {
      const created = await paymentProvider.createPendingInvoiceItem({
        customerId,
        amountYen,
        description: `RESON Support+ tips ${yearMonth}`,
        metadata: {
          type: 'support_plus_batch',
          support_plus_batch_id: batch.batch_id,
          year_month: yearMonth,
        },
        // Support+投げ銭はサブスク割引やクーポンの影響を受けてはならない。
        // DB上の精算額とStripeで実際に請求するline amountを一致させる。
        discountable: false,
        idempotencyKey: `support-plus:${batch.batch_id}`,
      })
      invoiceItemId = created.invoiceItemId
      invoiceItemsCreated += 1
    }

    const { error: markError } = await supabase.rpc('mark_support_plus_batch_invoice_item', {
      p_batch_id: batch.batch_id,
      p_stripe_invoice_item_id: invoiceItemId,
    })
    if (markError) {
      throw new Error(`Support+ invoice item persistence failed: ${markError.message}`)
    }
  }

  return {
    prepared: batches.length,
    invoiceItemsCreated,
    invoiceItemsRecovered,
  }
}
