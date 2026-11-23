import { getPlaybackRequestBlockReason, getSingleByteRange } from '@/lib/audio/playback-guard'

describe('playback request guard', () => {
  const origin = 'https://reson.example'

  it.each(['yt-dlp/2026.09.01', 'youtube-dl/2021.12.17', 'curl/8.0.0', 'FFmpeg/7.0'])(
    'blocks downloader user agent: %s',
    (userAgent) => {
      expect(getPlaybackRequestBlockReason(new Headers({ 'user-agent': userAgent }), origin)).toContain('ダウンローダー')
    }
  )

  it('accepts a same-origin browser audio request', () => {
    const headers = new Headers({
      'user-agent': 'Mozilla/5.0',
      'sec-fetch-dest': 'audio',
      'sec-fetch-site': 'same-origin',
      referer: 'https://reson.example/track?id=abc',
    })
    expect(getPlaybackRequestBlockReason(headers, origin)).toBeNull()
  })

  it('blocks cross-site and non-audio browser requests', () => {
    expect(getPlaybackRequestBlockReason(new Headers({ 'sec-fetch-site': 'cross-site' }), origin)).toContain('外部サイト')
    expect(getPlaybackRequestBlockReason(new Headers({ 'sec-fetch-dest': 'document' }), origin)).toContain('音声再生')
  })

  it('blocks a downloader that impersonates Chrome but has no browser playback context', () => {
    const headers = new Headers({
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
    })
    expect(getPlaybackRequestBlockReason(headers, origin)).toContain('再生コンテキスト')
  })

  it('allows the authenticated native-app channel only with its explicit header', () => {
    expect(getPlaybackRequestBlockReason(new Headers({ 'x-reson-playback-client': 'native' }), origin, true)).toBeNull()
    expect(getPlaybackRequestBlockReason(new Headers(), origin, true)).toContain('公式アプリ')
  })

  it('only accepts one syntactically valid byte range', () => {
    expect(getSingleByteRange('bytes=0-1023')).toBe('bytes=0-1023')
    expect(getSingleByteRange('bytes=1024-')).toBe('bytes=1024-')
    expect(getSingleByteRange('bytes=0-99,200-299')).toBeNull()
    expect(getSingleByteRange('items=0-1')).toBeNull()
  })
})
