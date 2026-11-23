import { createClient } from '@/lib/supabase/server'
import { buildAlbumCoverR2Key, getUploadUrl, getImageExt } from '@/lib/audio'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { album_id, content_type, content_length } = await req.json()

  const ext = getImageExt(content_type)
  if (!ext) {
    return NextResponse.json({ error: '対応していない画像形式です（jpeg/png/webp）' }, { status: 400 })
  }
  if (!album_id) {
    return NextResponse.json({ error: 'album_id は必須です' }, { status: 400 })
  }
  if (!Number.isSafeInteger(content_length) || content_length < 1 || content_length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '画像サイズは1〜10MBで指定してください' }, { status: 400 })
  }

  const { data: album } = await supabase
    .from('albums')
    .select('id, artist_id, artists ( user_id )')
    .eq('id', album_id)
    .single()

  const ownerUserId = (album?.artists as unknown as { user_id: string } | null)?.user_id
  if (!album || ownerUserId !== user.id) {
    return NextResponse.json({ error: 'このアルバムにジャケット画像を設定する権限がありません' }, { status: 403 })
  }

  const r2Key = buildAlbumCoverR2Key(album.artist_id, album_id, ext)

  const { error: updateError } = await supabase
    .from('albums')
    .update({ cover_r2_key: r2Key })
    .eq('id', album_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const uploadUrl = await getUploadUrl(r2Key, content_type, content_length)

  return NextResponse.json({ upload_url: uploadUrl, r2_key: r2Key })
}
