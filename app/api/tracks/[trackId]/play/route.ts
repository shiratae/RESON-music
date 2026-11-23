import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calcWeight, calcSecFactor } from '@/lib/distribution'
import { checkPlayEvent } from '@/lib/fraud'
import { NextRequest, NextResponse } from 'next/server'
import type { UserPlan } from '@/lib/distribution'

// 同一ユーザー×同一楽曲の連投を防ぐための最小再生間隔（秒）
const MIN_SECONDS_BETWEEN_REPORTS = 5

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { trackId } = await params
  const { played_sec, completed } = await req.json()
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip')

  if (typeof played_sec !== 'number' || !Number.isFinite(played_sec) || played_sec < 0) {
    return NextResponse.json({ error: 'played_sec が不正です' }, { status: 400 })
  }

  const { data: track } = await supabase
    .from('tracks')
    .select('id, duration_sec, ai_generated')
    .eq('id', trackId)
    .single()

  if (!track) {
    return NextResponse.json({ error: '楽曲が見つかりません' }, { status: 404 })
  }

  // played_sec が楽曲の全長を超えるレポートはクライアント側の改ざん/バグとして拒否
  if (played_sec > track.duration_sec) {
    return NextResponse.json({ error: 'played_sec が楽曲の長さを超えています' }, { status: 400 })
  }

  // 直前の再生ログから極端に短い間隔での連投を拒否（機械的な大量送信対策）
  const { data: lastEvent } = await service
    .from('play_events')
    .select('created_at')
    .eq('track_id', trackId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastEvent) {
    const elapsedSec = (Date.now() - new Date(lastEvent.created_at).getTime()) / 1000
    if (elapsedSec < MIN_SECONDS_BETWEEN_REPORTS) {
      return NextResponse.json({ error: '再生間隔が短すぎます' }, { status: 429 })
    }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (userData?.plan ?? 'free') as UserPlan
  const weight = calcWeight(plan, track.ai_generated)
  const sec_factor = calcSecFactor(played_sec, track.duration_sec)
  const isCompleted = completed ?? false

  // play_events は INSERT のみ（UPDATE 禁止）
  const { error: insertError } = await service.from('play_events').insert({
    track_id: trackId,
    user_id: user.id,
    user_plan: plan,
    played_sec,
    duration_sec: track.duration_sec,
    completed: isCompleted,
    weight,
    sec_factor,
    ip_address: ipAddress,
  })
  if (insertError) {
    return NextResponse.json({ error: '再生ログの記録に失敗しました' }, { status: 500 })
  }

  // 不正検知の簡易チェック（フラグが立った再生は分配計算から除外される）
  await checkPlayEvent(service, {
    trackId,
    userId: user.id,
    playedSec: played_sec,
    durationSec: track.duration_sec,
    completed: isCompleted,
  })

  return NextResponse.json({ ok: true, sec_factor })
}
