import { createClient } from '@/lib/supabase/server'
import { getImageExt, getStreamObject } from '@/lib/audio'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const supabase = await createClient()
  const { albumId } = await params

  const { data: album } = await supabase
    .from('albums')
    .select('cover_r2_key')
    .eq('id', albumId)
    .single()

  if (!album?.cover_r2_key) {
    return NextResponse.json({ error: 'ジャケット画像が登録されていません' }, { status: 404 })
  }

  // R2 の署名付きURLをブラウザに渡さない。画像もURL単体で取得可能になると、
  // 有効期限中はアプリの認可・監査を迂回できるため、楽曲と同様に中継する。
  const object = await getStreamObject(album.cover_r2_key)
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
