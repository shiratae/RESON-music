import { createClient } from '@/lib/supabase/server'
import { normalizeTrackCredits } from '@/lib/music/credits'
import { NextResponse } from 'next/server'

// 「いいね」した曲の集約（❤️応援ボタン=supports.amount_yen=0 を対象。投げ銭は含まない）
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('supports')
    .select(`
      track_id, created_at,
      tracks (
        id, title, duration_sec, ai_generated, recording_type, content_category,
        artists ( id, name ),
        track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
      )
    `)
    .eq('user_id', user.id)
    .eq('amount_yen', 0)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 同じ曲に複数回❤️した場合は最新のみ残す
  const seen = new Set<string>()
  const tracks = []
  for (const row of data ?? []) {
    const joinedTrack = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks
    if (!joinedTrack || seen.has(row.track_id)) continue
    seen.add(row.track_id)
    const { track_credits, ...track } = joinedTrack
    tracks.push({ ...track, credits: normalizeTrackCredits(track_credits) })
  }

  return NextResponse.json({ tracks })
}
