import { createBearerClient, createClient, createServiceClient } from '@/lib/supabase/server'
import { getStreamObject } from '@/lib/audio'
import { getPlaybackRequestBlockReason, getSingleByteRange } from '@/lib/audio/playback-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  // Web は HttpOnly Cookie、公式モバイルアプリは Supabase の短命 access token を
  // Bearer で渡す。後者はオフライン用キャッシュを作る際にも Range を含めて利用できる。
  const authorization = req.headers.get('authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const isOfficialNativeApp = Boolean(accessToken)
  const blockReason = getPlaybackRequestBlockReason(req.headers, req.nextUrl.origin, isOfficialNativeApp)
  if (blockReason) {
    return NextResponse.json({ error: blockReason }, { status: 403 })
  }

  const supabase = accessToken ? createBearerClient(accessToken) : await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { trackId } = await params

  const service = createServiceClient()
  const { data: track } = await service
    .from('tracks')
    .select('id, r2_key, duration_sec, review_status, fraud_suspended, artists ( user_id )')
    .eq('id', trackId)
    .single()

  if (!track) {
    return NextResponse.json({ error: '楽曲が見つかりません' }, { status: 404 })
  }

  const ownerUserId = (track.artists as unknown as { user_id: string } | null)?.user_id
  if (track.review_status !== 'approved' || track.fraud_suspended === true) {
    if (ownerUserId !== user.id) {
      return NextResponse.json({ error: 'この楽曲を再生する権限がありません' }, { status: 403 })
    }
  }

  const range = getSingleByteRange(req.headers.get('range'))
  if (req.headers.has('range') && !range) {
    return NextResponse.json({ error: '複数または不正な Range 要求は許可されていません' }, { status: 416 })
  }

  const object = await getStreamObject(track.r2_key, range ?? undefined)
  if (!object.Body) {
    return NextResponse.json({ error: '音声データを取得できませんでした' }, { status: 502 })
  }

  const headers = new Headers({
    'Content-Type': object.ContentType ?? 'application/octet-stream',
    'Content-Disposition': 'inline',
    'Accept-Ranges': 'bytes',
    // 音声データやレスポンスを共有キャッシュに残さない。
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'same-origin',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  })
  if (object.ContentLength !== undefined) headers.set('Content-Length', String(object.ContentLength))
  if (object.ContentRange) headers.set('Content-Range', object.ContentRange)
  if (object.ETag) headers.set('ETag', object.ETag)

  // Next.js Route Handler は Web Response を返せる。R2 の Body をそのまま
  // 流すことで、全曲をアプリサーバーのメモリへ読み込まない。
  return new NextResponse(object.Body.transformToWebStream(), {
    status: object.ContentRange ? 206 : 200,
    headers,
  })
}
