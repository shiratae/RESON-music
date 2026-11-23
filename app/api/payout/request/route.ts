import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MIN_PAYOUT_YEN = 1000

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const service = await createServiceClient()

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!artist) {
    return NextResponse.json({ error: 'アーティスト登録が必要です' }, { status: 403 })
  }

  const { data: balance } = await service
    .from('artist_balances')
    .select('balance_yen')
    .eq('artist_id', artist.id)
    .single()

  const balanceYen = balance?.balance_yen ?? 0
  if (balanceYen < MIN_PAYOUT_YEN) {
    return NextResponse.json(
      { error: `出金は¥${MIN_PAYOUT_YEN.toLocaleString()}以上から申請できます` },
      { status: 400 }
    )
  }

  const { data: existingPending } = await service
    .from('payout_requests')
    .select('id')
    .eq('artist_id', artist.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return NextResponse.json({ error: '出金申請は既に受付済みです（処理中）' }, { status: 409 })
  }

  const { data: request, error } = await service
    .from('payout_requests')
    .insert({ artist_id: artist.id, amount_yen: balanceYen })
    .select('id, amount_yen, status, requested_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ request })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!artist) {
    return NextResponse.json({ error: 'アーティスト登録が必要です' }, { status: 403 })
  }

  const { data: requests } = await supabase
    .from('payout_requests')
    .select('id, amount_yen, status, requested_at, processed_at')
    .eq('artist_id', artist.id)
    .order('requested_at', { ascending: false })
    .limit(12)

  return NextResponse.json({ requests: requests ?? [] })
}
