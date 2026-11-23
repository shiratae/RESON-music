import { createClient } from '@/lib/supabase/server'
import { rankTracksByHeat, calcArtistAffinity, applyAffinityBoost } from '@/lib/distribution'
import { fetchHeatScoredCandidates } from '@/lib/distribution/heat-candidates'
import { NextResponse } from 'next/server'
import { hasListeningDataOptIn } from '@/lib/privacy/settings'

const LIMIT = 10
const HISTORY_WINDOW_DAYS = 90

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { scores, trackById } = await fetchHeatScoredCandidates(supabase)

  if (scores.length === 0) {
    return NextResponse.json({ tracks: [] })
  }

  if (!await hasListeningDataOptIn(supabase, user.id)) {
    const ranked = rankTracksByHeat(scores, LIMIT)
    return NextResponse.json({
      tracks: ranked.map((score) => {
        const track = trackById.get(score.track_id)
        return track ? {
          id: track.id, title: track.title, duration_sec: track.duration_sec,
          ai_generated: track.ai_generated, cumulative_plays: track.cumulative_plays,
          artists: track.artists, completion_rate: score.completion_rate,
          support_rate: score.support_rate, heat_score: score.raw_score,
          because_you_like: false,
        } : null
      }).filter((track) => track !== null),
      personalized: false,
    })
  }

  // ユーザー自身の再生履歴からアーティストへの親和度を算出
  const since = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: historyEvents } = await supabase
    .from('play_events')
    .select('track_id, weight, sec_factor')
    .eq('user_id', user.id)
    .gte('created_at', since)

  const historyTrackIds = [...new Set((historyEvents ?? []).map((e) => e.track_id))]
  const { data: historyTracks } = historyTrackIds.length
    ? await supabase.from('tracks').select('id, artist_id').in('id', historyTrackIds)
    : { data: [] }

  const artistByTrack = new Map((historyTracks ?? []).map((t) => [t.id, t.artist_id]))
  const history = (historyEvents ?? [])
    .map((e) => {
      const artist_id = artistByTrack.get(e.track_id)
      if (!artist_id) return null
      return { artist_id, weight: e.weight * e.sec_factor }
    })
    .filter((h): h is { artist_id: string; weight: number } => h !== null)

  const affinity = calcArtistAffinity(history)
  const boosted = applyAffinityBoost(scores, affinity)
  const ranked = rankTracksByHeat(boosted, LIMIT)

  const result = ranked
    .map((s) => {
      const track = trackById.get(s.track_id)
      if (!track) return null
      return {
        id: track.id,
        title: track.title,
        duration_sec: track.duration_sec,
        ai_generated: track.ai_generated,
        cumulative_plays: track.cumulative_plays,
        artists: track.artists,
        completion_rate: s.completion_rate,
        support_rate: s.support_rate,
        heat_score: s.raw_score,
        because_you_like: (affinity.get(track.artist_id) ?? 0) > 0,
      }
    })
    .filter((t) => t !== null)

  return NextResponse.json({ tracks: result, personalized: affinity.size > 0 })
}
