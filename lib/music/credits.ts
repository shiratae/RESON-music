export const TRACK_CREDIT_ROLES = [
  'featured_artist',
  'vocalist',
  'composer',
  'lyricist',
  'arranger',
  'producer',
  'remixer',
  'illustrator',
  'character',
  'voice_actor',
  'original_artist',
] as const

export type TrackCreditRole = (typeof TRACK_CREDIT_ROLES)[number]

export interface TrackCredit {
  id?: string
  artist_id?: string | null
  display_name: string
  role: TrackCreditRole
  display_order: number
  artist?: { id: string; name: string } | null
}

export interface NormalizedTrackCreditInput {
  artist_id: string | null
  display_name: string
  role: TrackCreditRole
  display_order: number
}

export const TRACK_CREDIT_ROLE_LABELS: Record<TrackCreditRole, string> = {
  featured_artist: 'フィーチャリング',
  vocalist: 'ボーカル',
  composer: '作曲',
  lyricist: '作詞',
  arranger: '編曲',
  producer: 'プロデュース',
  remixer: 'リミックス',
  illustrator: 'イラスト',
  character: 'キャラクター',
  voice_actor: '声優・演者',
  original_artist: '原アーティスト',
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** APIへ渡すクレジット入力を検証し、DB保存用の形に整える。 */
export function normalizeTrackCreditInputs(input: unknown): NormalizedTrackCreditInput[] {
  if (input === undefined) return []
  if (!Array.isArray(input)) throw new Error('参加者クレジットは配列で指定してください')
  if (input.length > 20) throw new Error('参加者クレジットは20件以内です')

  return input.map((value, index) => {
    if (!value || typeof value !== 'object') throw new Error(`クレジット${index + 1}の形式が不正です`)
    const row = value as Record<string, unknown>
    const displayName = typeof row.display_name === 'string' ? row.display_name.trim() : ''
    if (!displayName || displayName.length > 100) {
      throw new Error(`クレジット${index + 1}の表示名は1〜100文字で指定してください`)
    }
    if (typeof row.role !== 'string' || !TRACK_CREDIT_ROLES.includes(row.role as TrackCreditRole)) {
      throw new Error(`クレジット${index + 1}の役割が不正です`)
    }
    const artistId = row.artist_id === undefined || row.artist_id === null || row.artist_id === ''
      ? null
      : row.artist_id
    if (artistId !== null && (typeof artistId !== 'string' || !UUID_PATTERN.test(artistId))) {
      throw new Error(`クレジット${index + 1}のアーティストIDが不正です`)
    }
    return {
      artist_id: artistId as string | null,
      display_name: displayName,
      role: row.role as TrackCreditRole,
      display_order: index,
    }
  })
}

function asArtist(value: unknown): { id: string; name: string } | null {
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first.id === 'string' && typeof first.name === 'string'
      ? { id: first.id, name: first.name }
      : null
  }
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string'
    && typeof (value as { name?: unknown }).name === 'string') {
    const artist = value as { id: string; name: string }
    return { id: artist.id, name: artist.name }
  }
  return null
}

export function normalizeTrackCredits(rows: unknown): TrackCredit[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((row, index) => {
      const role = typeof row.role === 'string' && TRACK_CREDIT_ROLES.includes(row.role as TrackCreditRole)
        ? row.role as TrackCreditRole
        : 'featured_artist'
      const displayName = typeof row.display_name === 'string' ? row.display_name : ''
      return {
        id: typeof row.id === 'string' ? row.id : undefined,
        artist_id: typeof row.artist_id === 'string' ? row.artist_id : null,
        display_name: displayName,
        role,
        display_order: typeof row.display_order === 'number' ? row.display_order : index,
        artist: asArtist(row.artists ?? row.artist),
      }
    })
    .filter((credit) => credit.display_name.length > 0)
    .sort((a, b) => a.display_order - b.display_order)
}

export function creditName(credit: TrackCredit) {
  return credit.artist?.name || credit.display_name
}

export function formatTrackArtistLine(
  primaryArtist: string | null | undefined,
  credits: TrackCredit[] = [],
  unknownArtistLabel = '不明なアーティスト'
) {
  const primary = primaryArtist || unknownArtistLabel
  const featured = credits.filter((credit) => credit.role === 'featured_artist').map(creditName)
  return featured.length > 0 ? `${primary} feat. ${featured.join('、')}` : primary
}

export function groupTrackCredits(credits: TrackCredit[]) {
  return TRACK_CREDIT_ROLES
    .map((role) => ({
      role,
      label: TRACK_CREDIT_ROLE_LABELS[role],
      credits: credits.filter((credit) => credit.role === role),
    }))
    .filter((group) => group.credits.length > 0)
}
