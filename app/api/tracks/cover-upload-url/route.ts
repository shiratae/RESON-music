import { createClient } from '@/lib/supabase/server'
import { buildCoverR2Key, getUploadUrl, getImageExt } from '@/lib/audio'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { track_id, content_type, content_length } = await req.json()

  const ext = getImageExt(content_type)
  if (!ext) {
    return NextResponse.json({ error: '対応していない画像形式です（jpeg/png/webp）' }, { status: 400 })
  }
  if (!track_id) {
    return NextResponse.json({ error: 'track_id は必須です' }, { status: 400 })
  }
  if (!Number.isSafeInteger(content_length) || content_length < 1 || content_length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '画像サイズは1〜10MBで指定してください' }, { status: 400 })
  }

  const { data: track } = await supabase
    .from('tracks')
    .select('id, artist_id, artists ( user_id )')
    .eq('id', track_id)
    .single()

  const ownerUserId = (track?.artists as unknown as { user_id: string } | null)?.user_id
  if (!track || ownerUserId !== user.id) {
    return NextResponse.json({ error: 'この楽曲にジャケット画像を設定する権限がありません' }, { status: 403 })
  }

  const r2Key = buildCoverR2Key(track.artist_id, track_id, ext)

  const { error: updateError } = await supabase
    .from('tracks')
    .update({ cover_r2_key: r2Key })
    .eq('id', track_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const uploadUrl = await getUploadUrl(r2Key, content_type, content_length)

  return NextResponse.json({ upload_url: uploadUrl, r2_key: r2Key })
}
