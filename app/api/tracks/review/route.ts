import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { reviewTrack } from '@/lib/moderation/tracks'
import { NextRequest, NextResponse } from 'next/server'

// 管理者専用エンドポイント（楽曲登録審査の承認/却下・手動運用を前提とした最小実装）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { track_id, action } = await req.json()
  if (!track_id || (action !== 'approved' && action !== 'rejected')) {
    return NextResponse.json({ error: 'track_id と action("approved"|"rejected") は必須です' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    const track = await reviewTrack(supabase, track_id, action)
    return NextResponse.json({ ok: true, track })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
