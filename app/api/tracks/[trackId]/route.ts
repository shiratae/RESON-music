import { createClient, createServiceClient } from '@/lib/supabase/server'
import { normalizeIsrc, isValidIsrc } from '@/lib/isrc'
import { normalizeTrackCreditInputs, normalizeTrackCredits } from '@/lib/music/credits'
import { normalizeTrackMetadata } from '@/lib/music/metadata'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params
  const supabase = await createClient()

  const { data: track } = await supabase
    .from('tracks')
    .select(`
      id, title, duration_sec, ai_generated, cumulative_plays, album_id, review_status,
      recording_type, content_category, source_track_id, source_title, source_artist_name,
      source_work_title, source_url, rights_status, rights_confirmed,
      artists ( id, name, founding_artist ),
      albums ( id, title, cover_r2_key, cover_url ),
      track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
    `)
    .eq('id', trackId)
    .single()

  if (!track || track.review_status !== 'approved') {
    return NextResponse.json({ error: '楽曲が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ track: { ...track, credits: normalizeTrackCredits(track.track_credits) } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await req.json()

  const { data: track } = await supabase
    .from('tracks')
    .select(`
      id, artist_id, review_status, recording_type, content_category, source_track_id,
      source_title, source_artist_name, source_work_title, source_url, rights_status,
      rights_confirmed, rights_note, artists ( user_id )
    `)
    .eq('id', trackId)
    .single()

  if (!track || (track.artists as unknown as { user_id: string } | null)?.user_id !== user.id) {
    return NextResponse.json({ error: 'この楽曲を編集する権限がありません' }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  let metadataChanged = false
  let normalizedCredits: ReturnType<typeof normalizeTrackCreditInputs> | undefined

  const metadataFields = [
    'recording_type', 'content_category', 'source_track_id', 'source_title',
    'source_artist_name', 'source_work_title', 'source_url', 'rights_status',
    'rights_confirmed', 'rights_note',
  ]
  if (metadataFields.some((field) => field in body)) {
    try {
      const metadata = normalizeTrackMetadata({
        recording_type: 'recording_type' in body ? body.recording_type : track.recording_type,
        content_category: 'content_category' in body ? body.content_category : track.content_category,
        source_track_id: 'source_track_id' in body ? body.source_track_id : track.source_track_id,
        source_title: 'source_title' in body ? body.source_title : track.source_title,
        source_artist_name: 'source_artist_name' in body ? body.source_artist_name : track.source_artist_name,
        source_work_title: 'source_work_title' in body ? body.source_work_title : track.source_work_title,
        source_url: 'source_url' in body ? body.source_url : track.source_url,
        rights_status: 'rights_status' in body ? body.rights_status : track.rights_status,
        rights_confirmed: 'rights_confirmed' in body ? body.rights_confirmed : track.rights_confirmed,
        rights_note: 'rights_note' in body ? body.rights_note : track.rights_note,
      })
      if (!metadata.rights_confirmed) {
        return NextResponse.json({ error: '配信に必要な権利確認に同意してください' }, { status: 400 })
      }
      if (metadata.source_track_id === trackId) {
        return NextResponse.json({ error: '自分自身を原曲として指定できません' }, { status: 400 })
      }
      if (metadata.source_track_id) {
        const { data: sourceTrack } = await supabase
          .from('tracks')
          .select('id, review_status, fraud_suspended')
          .eq('id', metadata.source_track_id)
          .maybeSingle()
        if (!sourceTrack || sourceTrack.review_status !== 'approved' || sourceTrack.fraud_suspended) {
          return NextResponse.json({ error: '指定されたRESON内の原曲が見つかりません' }, { status: 400 })
        }
      }
      Object.assign(update, metadata, {
        rights_confirmed_at: metadata.rights_confirmed ? new Date().toISOString() : null,
      })
      metadataChanged = true
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '楽曲情報が不正です' }, { status: 400 })
    }
  }

  if ('credits' in body) {
    try {
      normalizedCredits = normalizeTrackCreditInputs(body.credits)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'クレジット情報が不正です' }, { status: 400 })
    }
    const linkedArtistIds = [...new Set(normalizedCredits.map((credit) => credit.artist_id).filter(Boolean))] as string[]
    if (linkedArtistIds.length > 0) {
      const { data: linkedArtists } = await supabase
        .from('artists')
        .select('id')
        .in('id', linkedArtistIds)
        .eq('review_status', 'approved')
      const availableArtistIds = new Set((linkedArtists ?? []).map((artist) => artist.id))
      if (linkedArtistIds.some((id) => !availableArtistIds.has(id))) {
        return NextResponse.json({ error: '参加アーティストに指定されたアーティストが見つかりません' }, { status: 400 })
      }
    }
    metadataChanged = true
  }

  if ('album_id' in body) {
    const { album_id, track_number } = body
    if (album_id) {
      const { data: album } = await supabase
        .from('albums').select('artist_id').eq('id', album_id).single()
      if (!album || album.artist_id !== track.artist_id) {
        return NextResponse.json({ error: 'このアルバムに楽曲を追加する権限がありません' }, { status: 403 })
      }
    }
    update.album_id = album_id ?? null
    update.track_number = album_id ? (track_number ?? null) : null
  }

  if ('lyrics' in body) {
    if (typeof body.lyrics === 'string' && body.lyrics.length > 10000) {
      return NextResponse.json({ error: '歌詞は10000文字以内です' }, { status: 400 })
    }
    update.lyrics = typeof body.lyrics === 'string' ? body.lyrics : null
  }

  if ('isrc' in body) {
    if (typeof body.isrc === 'string' && body.isrc.trim()) {
      const normalized = normalizeIsrc(body.isrc)
      if (!isValidIsrc(normalized)) {
        return NextResponse.json({ error: 'ISRCの形式が不正です（例: US-RC1-76-07839）' }, { status: 400 })
      }
      const { data: existingIsrc } = await supabase
        .from('tracks').select('id').eq('isrc', normalized).neq('id', trackId).maybeSingle()
      if (existingIsrc) {
        return NextResponse.json({ error: 'このISRCは既に別の楽曲で使用されています' }, { status: 409 })
      }
      update.isrc = normalized
    } else {
      update.isrc = null
    }
  }

  // 原曲・クレジット・権利情報を変えた楽曲は、表示内容と権利関係を再確認する。
  if (metadataChanged && track.review_status === 'approved') {
    update.review_status = 'pending'
    update.reviewed_at = null
  }

  const { data: updated, error } = await supabase
    .from('tracks')
    .update(update)
    .eq('id', trackId)
    .select(`
      id, title, album_id, track_number, lyrics, isrc, review_status,
      recording_type, content_category, source_track_id, source_title, source_artist_name,
      source_work_title, source_url, rights_status, rights_confirmed,
      track_credits ( id, artist_id, display_name, role, display_order, artists ( id, name ) )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (normalizedCredits) {
    const service = createServiceClient()
    const { data: previousCredits } = await service
      .from('track_credits')
      .select('artist_id, display_name, role, display_order')
      .eq('track_id', trackId)

    const { error: deleteCreditsError } = await service.from('track_credits').delete().eq('track_id', trackId)
    if (deleteCreditsError) {
      return NextResponse.json({ error: deleteCreditsError.message }, { status: 500 })
    }
    const { error: insertCreditsError } = await service.from('track_credits').insert(
      normalizedCredits.map((credit) => ({ ...credit, track_id: trackId }))
    )
    if (insertCreditsError) {
      if (previousCredits && previousCredits.length > 0) {
        await service.from('track_credits').insert(
          previousCredits.map((credit) => ({ ...credit, track_id: trackId }))
        )
      }
      return NextResponse.json({ error: insertCreditsError.message }, { status: 500 })
    }
  }

  const { data: finalCredits } = await createServiceClient()
    .from('track_credits')
    .select('id, artist_id, display_name, role, display_order, artists ( id, name )')
    .eq('track_id', trackId)
    .order('display_order', { ascending: true })

  return NextResponse.json({ track: { ...updated, credits: normalizeTrackCredits(finalCredits) } })
}
