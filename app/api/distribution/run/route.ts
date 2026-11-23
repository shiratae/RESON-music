import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { runMonthlyDistribution } from '@/lib/distribution/batch'
import { runCuratorBatch } from '@/lib/curator'
import { prepareSupportPlusBilling } from '@/lib/payment/support-plus'
import { NextRequest, NextResponse } from 'next/server'

// 管理者専用エンドポイント（Vercel Cron or 手動実行）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { year_month } = await req.json()
  if (!year_month || !/^\d{4}-\d{2}$/.test(year_month)) {
    return NextResponse.json({ error: 'year_month は "YYYY-MM" 形式で指定してください' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Support+ の deferred tip を先に月次請求へ固定する。
  // artist credit はここでは行わず、Stripe invoice.paid webhook が
  // confirmed -> settlement -> ledger credit をDB内で原子的に実行する。
  const supportPlusBilling = await prepareSupportPlusBilling(supabase, year_month)

  const result = await runMonthlyDistribution(supabase, year_month)

  // Webhook処理済みだが settlement が未完了だったケースの冪等なreconciliation。
  // 未回収/失敗中のbilling batchは settle_support_plus_tips 側で対象外になる。
  const { error: supportSettlementError } = await supabase.rpc('settle_support_plus_tips', {
    p_year_month: year_month,
  })
  if (supportSettlementError) {
    throw new Error(`Support+ settlement reconciliation failed: ${supportSettlementError.message}`)
  }

  // 追加ブースト（サブスク請求合算分）も同時精算
  await supabase.rpc('settle_monthly_boosts', { p_year_month: year_month })

  // キュレーターランク（先見性スコア）の集計も同時実行
  await runCuratorBatch(supabase)

  return NextResponse.json({ ok: true, support_plus_billing: supportPlusBilling, ...result })
}
