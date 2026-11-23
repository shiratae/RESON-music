# オフライン再生の接続仕様

Web版の楽曲再生は、認証済み Cookie とブラウザの再生コンテキストでのみ許可されます。
R2 の署名付き URL は返しません。

公式 iOS / Android アプリがオフライン再生用に楽曲をキャッシュする場合は、ログイン中の
Supabase session から得た短命の access token を使い、次のリクエストを行います。

```http
GET /api/tracks/{trackId}/stream
Authorization: Bearer {supabase_access_token}
X-RESON-Playback-Client: native
Range: bytes=0-
```

- `Range` は任意ですが、再開ダウンロードやシークのため単一 Range を推奨します。
- 応答は R2 URL へのリダイレクトではなく、認証・権限検査済みの音声ストリームです。
- キャッシュはアプリのプライベート領域に保存し、OS の共有ストレージやユーザーが開ける
  ダウンロードフォルダーには保存しません。

この仕組みは Web からのダウンロードと `yt-dlp` の通常利用を防ぐ対策です。端末上で
再生できる音声を、端末所有者から完全に取り出せなくすることはサーバーだけではできません。
root 化端末等も含めて強く保護する要件がある場合は、ネイティブアプリで Widevine / FairPlay
などの DRM と端末証明を導入してください。
