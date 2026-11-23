import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasListeningDataOptIn } from '@/lib/privacy/settings'

const TOP_N = 5

// 聴取データ（play_events × track_genres）からジャンル親和度を集計し、
// 音楽人格タグの候補として提案する。persona_tags自体は自己申告制のまま維持し、
// この提案はあくまでユーザーが選んで追加するかどうかを決める形にする。
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  if (!await hasListeningDataOptIn(supabase, user.id)) {
    return NextResponse.json({ suggested_tags: [] })
  }

  const { data: events } = await supabase
    .from('play_events')
    .select('track_id, sec_factor')
    .eq('user_id', user.id)
    .gt('sec_factor', 0)

  if (!events || events.length === 0) {
    return NextResponse.json({ suggested_tags: [] })
  }

  const trackIds = [...new Set(events.map((e) => e.track_id))]
  const { data: genreRows } = await supabase
    .from('track_genres')
    .select('track_id, genres ( name )')
    .in('track_id', trackIds)

  const weightByTrack = new Map<string, number>()
  for (const e of events) {
    weightByTrack.set(e.track_id, (weightByTrack.get(e.track_id) ?? 0) + e.sec_factor)
  }

  const scoreByGenre = new Map<string, number>()
  for (const row of genreRows ?? []) {
    const name = (row.genres as unknown as { name: string } | null)?.name
    if (!name) continue
    const weight = weightByTrack.get(row.track_id) ?? 0
    scoreByGenre.set(name, (scoreByGenre.get(name) ?? 0) + weight)
  }

  const suggestedTags = [...scoreByGenre.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([name]) => name)

  return NextResponse.json({ suggested_tags: suggestedTags })
}
