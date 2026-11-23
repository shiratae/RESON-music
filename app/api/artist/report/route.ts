import { createClient } from '@/lib/supabase/server'
import { normalizeTrackCredits } from '@/lib/music/credits'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, review_status, founding_artist')
    .eq('user_id', user.id)
    .single()

  if (!artist) {
    return NextResponse.json({ error: 'アーティスト登録が必要です' }, { status: 403 })
  }

  const [distributionsRes, balanceRes, tracksRes] = await Promise.all([
    supabase
      .from('monthly_distributions')
      .select('year_month, distribution_yen, score_breakdown, tips_yen')
      .eq('artist_id', artist.id)
      .order('year_month', { ascending: false })
      .limit(12),
    supabase
      .from('artist_balances')
      .select('balance_yen, dormant')
      .eq('artist_id', artist.id)
      .single(),
    supabase
      .from('tracks')
      .select(`
        id, title, cumulative_plays, in_distribution, ai_generated, review_status, isrc,
        recording_type, content_category, source_title, source_artist_name, source_work_title,
        source_url, rights_status, rights_confirmed, rights_note,
        track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
      `)
      .eq('artist_id', artist.id)
      .order('cumulative_plays', { ascending: false }),
  ])

  return NextResponse.json({
    artist,
    balance: balanceRes.data ?? { balance_yen: 0, dormant: false },
    distributions: distributionsRes.data ?? [],
    tracks: (tracksRes.data ?? []).map((track) => {
      const { track_credits, ...rest } = track
      return { ...rest, credits: normalizeTrackCredits(track_credits) }
    }),
  })
}
