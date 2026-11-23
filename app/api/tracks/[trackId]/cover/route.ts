import { createClient } from '@/lib/supabase/server'
import { getImageExt, getStreamObject } from '@/lib/audio'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const supabase = await createClient()
  const { trackId } = await params

  const { data: track } = await supabase
    .from('tracks')
    .select('cover_r2_key')
    .eq('id', trackId)
    .single()

  if (!track?.cover_r2_key) {
    return NextResponse.json({ error: 'ジャケット画像が登録されていません' }, { status: 404 })
  }

  // R2 の署名付きURLをブラウザに渡さない。ジャケットはアプリ経由で配信し、
  // URL単体での認可・監査迂回を防ぐ。
  const object = await getStreamObject(track.cover_r2_key)
  if (!object.Body || !getImageExt(object.ContentType ?? '')) {
    return NextResponse.json({ error: '画像データを取得できませんでした' }, { status: 502 })
  }

  const headers = new Headers({
    'Content-Type': object.ContentType!,
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'same-origin',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  })
  if (object.ContentLength !== undefined) headers.set('Content-Length', String(object.ContentLength))
  if (object.ETag) headers.set('ETag', object.ETag)

  return new NextResponse(object.Body.transformToWebStream(), { headers })
}
