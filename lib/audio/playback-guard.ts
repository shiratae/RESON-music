/**
 * ブラウザ再生用エンドポイントの最低限の自動取得対策。
 *
 * User-Agent は偽装できるため、これは DRM ではない。R2 の実 URL をクライアントへ
 * 渡さず、既知のダウンローダーとクロスサイト要求を早期に拒否するために使う。
 */
const BLOCKED_USER_AGENT = /(?:yt-dlp|youtube-dl|aria2|curl\/|wget\/|python-requests|httpie|ffmpeg|axel)/i

export function getPlaybackRequestBlockReason(
  headers: Headers,
  requestOrigin: string,
  isOfficialNativeApp = false
): string | null {
  const userAgent = headers.get('user-agent') ?? ''
  if (BLOCKED_USER_AGENT.test(userAgent)) return '自動ダウンローダーからの再生は許可されていません'

  // ネイティブアプリは Fetch Metadata / Referer を送らないため、Bearer 認証済みかつ
  // 明示的に公式クライアントとして宣言した要求だけを例外にする。
  if (isOfficialNativeApp) {
    return headers.get('x-reson-playback-client') === 'native'
      ? null
      : '公式アプリの再生ヘッダーが必要です'
  }

  const fetchDest = headers.get('sec-fetch-dest')
  if (fetchDest && fetchDest !== 'audio') return 'ブラウザの音声再生要求ではありません'

  const fetchSite = headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return '外部サイトからの再生は許可されていません'
  }

  // Referer が送られる環境では、埋め込み・直リンクを同一オリジンに限定する。
  const referer = headers.get('referer')
  if (referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) {
        return '外部サイトからの再生は許可されていません'
      }
    } catch {
      return '不正な再生要求です'
    }
  }

  // yt-dlp は Chrome 風の UA を使えるため、UA 判定だけでは足りない。通常の
  // <audio> 要素が送る Fetch Metadata または同一オリジン Referer を必須にする。
  if (!fetchDest && !fetchSite && !referer) {
    return 'ブラウザの音声再生コンテキストが必要です'
  }

  return null
}

/** HTMLMediaElement が使う単一 Range だけを R2 に転送する。 */
export function getSingleByteRange(range: string | null): string | null {
  if (!range) return null
  return /^bytes=\d*-\d*$/.test(range) ? range : null
}
