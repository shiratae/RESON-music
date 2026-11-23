import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildR2Key, getUploadUrl, getAudioExt } from '@/lib/audio'
import { normalizeIsrc, isValidIsrc } from '@/lib/isrc'
import { normalizeTrackCreditInputs } from '@/lib/music/credits'
import { normalizeTrackMetadata } from '@/lib/music/metadata'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await req.json()
  const {
    content_type,
    content_length,
    title,
    duration_sec,
    ai_generated,
    genre_ids,
    album_id,
    track_number,
    isrc,
    credits,
    recording_type,
    content_category,
    source_track_id,
    source_title,
    source_artist_name,
    source_work_title,
    source_url,
    rights_status,
    rights_confirmed,
    rights_note,
  } = body

  let metadata: ReturnType<typeof normalizeTrackMetadata>
  let normalizedCredits: ReturnType<typeof normalizeTrackCreditInputs>
  try {
    metadata = normalizeTrackMetadata({
      recording_type,
      content_category,
      source_track_id,
      source_title,
      source_artist_name,
      source_work_title,
      source_url,
      rights_status,
      rights_confirmed,
      rights_note,
    })
    normalizedCredits = normalizeTrackCreditInputs(credits)
    if (!metadata.rights_confirmed) throw new Error('配信に必要な権利確認に同意してください')
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '楽曲情報が不正です' }, { status: 400 })
  }

  const ext = getAudioExt(content_type)
  if (!ext) {
    return NextResponse.json({ error: '対応していないファイル形式です（mp3/m4a/flac/wav/ogg）' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
  }
  if (!duration_sec || duration_sec < 1 || duration_sec > 7200) {
    return NextResponse.json({ error: '楽曲の長さが不正です' }, { status: 400 })
  }
  if (!Number.isSafeInteger(content_length) || content_length < 1 || content_length > 200 * 1024 * 1024) {
    return NextResponse.json({ error: 'ファイルサイズは1〜200MBで指定してください' }, { status: 400 })
  }

  let normalizedIsrc: string | null = null
  if (isrc && typeof isrc === 'string' && isrc.trim()) {
    normalizedIsrc = normalizeIsrc(isrc)
    if (!isValidIsrc(normalizedIsrc)) {
      return NextResponse.json({ error: 'ISRCの形式が不正です（例: US-RC1-76-07839）' }, { status: 400 })
    }
    const { data: existingIsrc } = await supabase
      .from('tracks').select('id').eq('isrc', normalizedIsrc).maybeSingle()
    if (existingIsrc) {
      return NextResponse.json({ error: 'このISRCは既に別の楽曲で使用されています' }, { status: 409 })
    }
  }

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!artist) {
    return NextResponse.json({ error: 'アーティスト登録が必要です' }, { status: 403 })
  }

  if (album_id) {
    const { data: album } = await supabase
      .from('albums').select('artist_id').eq('id', album_id).single()
    if (!album || album.artist_id !== artist.id) {
      return NextResponse.json({ error: 'このアルバムに楽曲を追加する権限がありません' }, { status: 403 })
    }
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

  const linkedArtistIds = [...new Set(normalizedCredits.map((credit) => credit.artist_id).filter(Boolean))] as string[]
  if (linkedArtistIds.length > 0) {
    const { data: linkedArtists } = await supabase
      .from('artists')
      .select('id, name')
      .in('id', linkedArtistIds)
      .eq('review_status', 'approved')
    const availableArtistIds = new Set((linkedArtists ?? []).map((linkedArtist) => linkedArtist.id))
    if (linkedArtistIds.some((id) => !availableArtistIds.has(id))) {
      return NextResponse.json({ error: '参加アーティストに指定されたアーティストが見つかりません' }, { status: 400 })
    }
  }

  const trackId = randomUUID()
  const r2Key = buildR2Key(artist.id, trackId, ext)

  // tracks に pending レコードを作成（r2_key を確保）
  const service = createServiceClient()
  const { error: insertError } = await service.from('tracks').insert({
    id: trackId,
    artist_id: artist.id,
    title: title.trim(),
    duration_sec,
    r2_key: r2Key,
    ai_generated: ai_generated ?? false,
    album_id: album_id ?? null,
    track_number: album_id ? (track_number ?? null) : null,
    isrc: normalizedIsrc,
    recording_type: metadata.recording_type,
    content_category: metadata.content_category,
    source_track_id: metadata.source_track_id,
    source_title: metadata.source_title,
    source_artist_name: metadata.source_artist_name,
    source_work_title: metadata.source_work_title,
    source_url: metadata.source_url,
    rights_status: metadata.rights_status,
    rights_confirmed: metadata.rights_confirmed,
    rights_confirmed_at: metadata.rights_confirmed ? new Date().toISOString() : null,
    rights_note: metadata.rights_note,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (Array.isArray(genre_ids) && genre_ids.length > 0) {
    await service
      .from('track_genres')
      .insert(genre_ids.slice(0, 3).map((genre_id: string) => ({ track_id: trackId, genre_id })))
  }

  if (normalizedCredits.length > 0) {
    const { error: creditsError } = await service.from('track_credits').insert(
      normalizedCredits.map((credit) => ({ ...credit, track_id: trackId }))
    )
    if (creditsError) {
      await service.from('tracks').delete().eq('id', trackId).eq('artist_id', artist.id)
      return NextResponse.json({ error: creditsError.message }, { status: 500 })
    }
  }

  const uploadUrl = await getUploadUrl(r2Key, content_type, content_length)

  return NextResponse.json({ track_id: trackId, upload_url: uploadUrl, r2_key: r2Key })
}
