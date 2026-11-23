import { createClient } from '@/lib/supabase/server'
import { normalizeTrackCredits } from '@/lib/music/credits'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, user_id, title, is_public, created_at, updated_at')
    .eq('id', playlistId)
    .single()

  if (!playlist) {
    return NextResponse.json({ error: 'プレイリストが見つかりません' }, { status: 404 })
  }

  const { data: rows } = await supabase
    .from('playlist_tracks')
    .select(`
      position, track_id,
      tracks (
        id, title, duration_sec, ai_generated,
        artists ( id, name ),
        track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
      )
    `)
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()

  const tracks = (rows ?? []).map((row) => {
    const joinedTrack = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks
    if (!joinedTrack) return row
    const { track_credits, ...track } = joinedTrack
    return { ...row, tracks: { ...track, credits: normalizeTrackCredits(track_credits) } }
  })

  return NextResponse.json({ playlist, tracks, is_owner: user?.id === playlist.user_id })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { title, is_public } = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof title === 'string' && title.trim()) update.title = title.trim()
  if (typeof is_public === 'boolean') update.is_public = is_public

  const { data, error } = await supabase
    .from('playlists')
    .update(update)
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .select('id, title, is_public')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '更新する権限がありません' }, { status: 403 })
  }

  return NextResponse.json({ playlist: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
