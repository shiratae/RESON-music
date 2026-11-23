import { createClient, createServiceClient } from '@/lib/supabase/server'
import { paymentProvider } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'

const FREE_BOOSTS_PER_MONTH = 3
const MAX_BOOSTS_PER_MONTH = 23
const BOOST_PRICE_YEN = 30

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const yearMonth = currentYearMonth()
  const { count } = await supabase
    .from('boost_hearts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('year_month', yearMonth)

  const used = count ?? 0
  return NextResponse.json({
    used,
    remaining: Math.max(MAX_BOOSTS_PER_MONTH - used, 0),
    free_remaining: Math.max(FREE_BOOSTS_PER_MONTH - used, 0),
    price_yen: BOOST_PRICE_YEN,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { track_id } = await req.json()
  if (!track_id) {
    return NextResponse.json({ error: 'track_id は必須です' }, { status: 400 })
  }

  const { data: track } = await supabase.from('tracks').select('id').eq('id', track_id).single()
  if (!track) {
    return NextResponse.json({ error: '楽曲が見つかりません' }, { status: 404 })
  }

  const yearMonth = currentYearMonth()
  const { count } = await supabase
    .from('boost_hearts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('year_month', yearMonth)

  const used = count ?? 0
  if (used >= MAX_BOOSTS_PER_MONTH) {
    return NextResponse.json({ error: `今月のブーストは${MAX_BOOSTS_PER_MONTH}回が上限です` }, { status: 429 })
  }

  // 無料分が残っている場合は即時記録
  if (used < FREE_BOOSTS_PER_MONTH) {
    const { error } = await service.from('boost_hearts').insert({
      track_id,
      user_id: user.id,
      year_month: yearMonth,
      amount_yen: 0,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, type: 'free', remaining: MAX_BOOSTS_PER_MONTH - used - 1 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('plan, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const plan = (userData as { plan?: string })?.plan ?? 'free'
  const customerId = (userData as { stripe_customer_id?: string })?.stripe_customer_id

  // サブスク契約がある場合：都度課金せず、次回のサブスク請求に合算する（30円がStripeの
  // 実用上の最低決済額50円を下回るため。月末に settle_monthly_boosts で残高へ反映）
  if (plan !== 'free' && customerId) {
    await paymentProvider.createPendingInvoiceItem({
      customerId,
      amountYen: BOOST_PRICE_YEN,
      description: `追加ブーストハート🚀（${yearMonth}）`,
      metadata: { type: 'boost', track_id, user_id: user.id, year_month: yearMonth },
    })

    const { error } = await service.from('boost_hearts').insert({
      track_id,
      user_id: user.id,
      year_month: yearMonth,
      amount_yen: BOOST_PRICE_YEN,
      billed: false,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      type: 'deferred_to_invoice',
      remaining: MAX_BOOSTS_PER_MONTH - used - 1,
      price_yen: BOOST_PRICE_YEN,
    })
  }

  // Free プラン（サブスクなし）は都度課金するしかない
  const { clientSecret } = await paymentProvider.createOneTimeCharge({
    amountYen: BOOST_PRICE_YEN,
    customerId: customerId ?? undefined,
    metadata: { type: 'boost', track_id, user_id: user.id, year_month: yearMonth },
  })

  return NextResponse.json({
    ok: true,
    type: 'paid',
    client_secret: clientSecret,
    price_yen: BOOST_PRICE_YEN,
  })
}
