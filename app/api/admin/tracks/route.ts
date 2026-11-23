import { requireAdmin } from '@/lib/admin/auth'
import { normalizeTrackCredits } from '@/lib/music/credits'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('tracks')
    .select(`
      id, title, ai_generated, review_status, created_at, recording_type, content_category,
      source_title, source_artist_name, source_work_title, source_url, rights_status,
      rights_confirmed, rights_note,
      artists ( id, name ),
      track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
    `)
    .eq('review_status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tracks = (data ?? []).map((track) => {
    const { track_credits, ...rest } = track
    return { ...rest, credits: normalizeTrackCredits(track_credits) }
  })

  return NextResponse.json({ tracks })
}
