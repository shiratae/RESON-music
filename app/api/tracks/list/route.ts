import { createClient } from '@/lib/supabase/server'
import { normalizeTrackCredits } from '@/lib/music/credits'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const q = req.nextUrl.searchParams.get('q')

  const query = supabase
    .from('tracks')
    .select(`
      id,
      title,
      duration_sec,
      ai_generated,
      cumulative_plays,
      album_id,
      recording_type,
      content_category,
      source_title,
      source_artist_name,
      source_work_title,
      artists ( id, name ),
      track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
    `)
    .eq('review_status', 'approved')
    .eq('fraud_suspended', false)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalizedQuery = q?.trim().toLocaleLowerCase()
  const tracks = (data ?? []).map((track) => {
    const { track_credits, ...rest } = track
    const artists = Array.isArray(track.artists) ? track.artists[0] : track.artists
    return { ...rest, artists, credits: normalizeTrackCredits(track_credits) }
  }).filter((track) => {
    if (!normalizedQuery) return true
    const searchable = [
      track.title,
      track.artists?.name,
      track.source_title,
      track.source_artist_name,
      track.source_work_title,
      ...track.credits.map((credit) => credit.display_name),
      ...track.credits.map((credit) => credit.artist?.name),
    ]
    return searchable.some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
  })

  return NextResponse.json({ tracks })
}
