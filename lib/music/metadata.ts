export const RECORDING_TYPES = [
  'original',
  'cover',
  'remix',
  'arrangement',
  'medley',
  'live',
  'instrumental',
] as const

export type RecordingType = (typeof RECORDING_TYPES)[number]

export const CONTENT_CATEGORIES = [
  'none',
  'anime',
  'game',
  'visual_novel',
  'vtuber',
  'virtual_character',
  'voice_synth',
  'other',
] as const

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]

export const RIGHTS_STATUSES = [
  'original',
  'permission_obtained',
  'public_domain',
] as const

export type RightsStatus = (typeof RIGHTS_STATUSES)[number]

export interface NormalizedTrackMetadata {
  recording_type: RecordingType
  content_category: ContentCategory
  source_track_id: string | null
  source_title: string | null
  source_artist_name: string | null
  source_work_title: string | null
  source_url: string | null
  rights_status: RightsStatus
  rights_confirmed: boolean
  rights_note: string | null
}

const SOURCE_REQUIRED_TYPES: RecordingType[] = ['cover', 'remix', 'arrangement', 'medley']

function text(value: unknown, maxLength: number, fieldName: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new Error(`${fieldName}は文字列で指定してください`)
  const trimmed = value.trim()
  if (trimmed.length > maxLength) throw new Error(`${fieldName}は${maxLength}文字以内です`)
  return trimmed || null
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, fallback: T[number], fieldName: string) {
  const candidate = value === undefined || value === null || value === '' ? fallback : value
  if (typeof candidate !== 'string' || !values.includes(candidate)) {
    throw new Error(`${fieldName}の値が不正です`)
  }
  return candidate as T[number]
}

function optionalUuid(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${fieldName}の形式が不正です`)
  }
  return value
}

function optionalUrl(value: unknown) {
  const url = text(value, 500, '参照URL')
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
  } catch {
    throw new Error('参照URLはhttpまたはhttpsのURLを指定してください')
  }
  return url
}

/**
 * Upload/PATCH APIで共通利用する二次元コンテンツ向けメタデータの検証。
 * 入力値はJSON由来のunknownとして扱い、DBへ渡す前に正規化する。
 */
export function normalizeTrackMetadata(input: Record<string, unknown>): NormalizedTrackMetadata {
  const recordingType = enumValue(input.recording_type, RECORDING_TYPES, 'original', '楽曲種別')
  const contentCategory = enumValue(input.content_category, CONTENT_CATEGORIES, 'none', 'コンテンツ分類')
  const defaultRightsStatus: RightsStatus = recordingType === 'original' ? 'original' : 'permission_obtained'
  const rightsStatus = enumValue(input.rights_status, RIGHTS_STATUSES, defaultRightsStatus, '権利状態')
  const rightsConfirmed = input.rights_confirmed === undefined ? recordingType === 'original' : input.rights_confirmed === true

  const sourceTitle = text(input.source_title, 200, '原曲・元作品名')
  const sourceArtistName = text(input.source_artist_name, 200, '原アーティスト名')
  const sourceWorkTitle = text(input.source_work_title, 200, '作品・コンテンツ名')
  const sourceUrl = optionalUrl(input.source_url)
  const sourceTrackId = optionalUuid(input.source_track_id, 'RESON内の原曲ID')
  const rightsNote = text(input.rights_note, 1000, '権利確認メモ')

  if (SOURCE_REQUIRED_TYPES.includes(recordingType) && !sourceTitle) {
    throw new Error('カバー・リミックス・アレンジ・メドレーは原曲・元作品名が必須です')
  }
  if (recordingType !== 'original' && !rightsConfirmed) {
    throw new Error('カバー・二次創作音源は、必要な許諾を確認したうえで登録してください')
  }
  if (rightsStatus === 'original' && recordingType !== 'original') {
    throw new Error('オリジナル楽曲以外の権利状態には「オリジナル」を指定できません')
  }
  if (contentCategory !== 'none' && !sourceWorkTitle) {
    throw new Error('二次元コンテンツを指定した場合は作品・コンテンツ名が必須です')
  }

  return {
    recording_type: recordingType,
    content_category: contentCategory,
    source_track_id: sourceTrackId,
    source_title: sourceTitle,
    source_artist_name: sourceArtistName,
    source_work_title: sourceWorkTitle,
    source_url: sourceUrl,
    rights_status: rightsStatus,
    rights_confirmed: rightsConfirmed,
    rights_note: rightsNote,
  }
}

export const RECORDING_TYPE_LABELS: Record<RecordingType, string> = {
  original: 'オリジナル',
  cover: 'カバー',
  remix: 'リミックス',
  arrangement: 'アレンジ／替え歌',
  medley: 'メドレー',
  live: 'ライブ／配信音源',
  instrumental: 'インストゥルメンタル',
}

export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  none: '一般楽曲',
  anime: 'アニメ',
  game: 'ゲーム',
  visual_novel: 'ノベルゲーム',
  vtuber: 'VTuber／配信者',
  virtual_character: 'バーチャルキャラクター',
  voice_synth: '音声合成・ボーカロイド',
  other: 'その他の二次元コンテンツ',
}

export const RIGHTS_STATUS_LABELS: Record<RightsStatus, string> = {
  original: '自作・権利保有',
  permission_obtained: '必要な許諾を確認済み',
  public_domain: 'パブリックドメイン',
}
