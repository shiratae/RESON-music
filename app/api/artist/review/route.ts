import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { NextRequest, NextResponse } from 'next/server'

// 管理者専用エンドポイント（アーティスト登録審査の承認/却下・手動運用を前提とした最小実装）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { artist_id, action } = await req.json()
  if (!artist_id || (action !== 'approved' && action !== 'rejected')) {
    return NextResponse.json({ error: 'artist_id と action("approved"|"rejected") は必須です' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: artist, error } = await supabase
    .from('artists')
    .update({ review_status: action, reviewed_at: new Date().toISOString() })
    .eq('id', artist_id)
    .eq('review_status', 'pending')
    .select('id, name, review_status')
    .single()

  if (error || !artist) {
    return NextResponse.json({ error: '審査待ちのアーティストが見つかりません' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, artist })
}
