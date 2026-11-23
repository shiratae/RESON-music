import { createClient, createServiceClient } from '@/lib/supabase/server'
import { paymentProvider } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'
import type { UserPlan } from '@/lib/distribution'

const TIP_FEE_RATE: Record<UserPlan, number> = {
  free: 0.10,
  standard: 0.08,
  student: 0.06,
  support_plus: 0, // 月末一括で別処理
}

const MIN_TIP_YEN = 100

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { track_id, amount_yen } = await req.json()

  if (!track_id) {
    return NextResponse.json({ error: 'track_id は必須です' }, { status: 400 })
  }

  // 投げ銭ありの場合は最低金額チェック
  if (amount_yen && amount_yen > 0 && amount_yen < MIN_TIP_YEN) {
    return NextResponse.json({ error: `投げ銭は${MIN_TIP_YEN}円以上です` }, { status: 400 })
  }

  const { data: track } = await supabase
    .from('tracks')
    .select('id, cumulative_plays')
    .eq('id', track_id)
    .single()

  if (!track) {
    return NextResponse.json({ error: '楽曲が見つかりません' }, { status: 404 })
  }

  // ❤️のみ（amount_yen = 0 or 未指定）
  if (!amount_yen || amount_yen === 0) {
    const { error } = await service.from('supports').insert({
      track_id,
      user_id: user.id,
      amount_yen: 0,
      track_plays_at_support: track.cumulative_plays,
      funding_status: 'not_applicable',
    })
    if (error) {
      return NextResponse.json({ error: '応援の記録に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, type: 'heart' })
  }

  // 投げ銭あり → Stripe PaymentIntent 作成
  const { data: userData } = await supabase
    .from('users')
    .select('plan, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const plan = ((userData as { plan: string })?.plan ?? 'free') as UserPlan
  const feeRate = TIP_FEE_RATE[plan]

  // Support+ は「未回収の月次債務」として記録する。
  // この時点では artist balance へ反映しない。Stripe invoice.paid を確認した後に
  // DB内の settlement RPC が confirmed -> settlement -> ledger credit を原子的に行う。
  if (plan === 'support_plus') {
    const billingPeriod = new Date().toISOString().slice(0, 7)
    const { data: support, error } = await service
      .from('supports')
      .insert({
        track_id,
        user_id: user.id,
        amount_yen,
        track_plays_at_support: track.cumulative_plays,
        plan_at_support: 'support_plus',
        billing_period: billingPeriod,
        funding_status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: '応援の記録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      type: 'tip_deferred',
      support_id: support?.id,
      billing_period: billingPeriod,
    })
  }

  // 手数料込みの請求額
  const chargeYen = Math.ceil(amount_yen / (1 - feeRate))

  const customerId = (userData as { stripe_customer_id?: string })?.stripe_customer_id

  const { clientSecret } = await paymentProvider.createOneTimeCharge({
    amountYen: chargeYen,
    customerId: customerId ?? undefined,
    metadata: { track_id, user_id: user.id, plan, net_yen: String(amount_yen), track_plays_at_support: String(track.cumulative_plays) },
  })

  return NextResponse.json({
    ok: true,
    type: 'tip',
    client_secret: clientSecret,
    charge_yen: chargeYen,
    net_yen: amount_yen,
    fee_rate: feeRate,
  })
}
