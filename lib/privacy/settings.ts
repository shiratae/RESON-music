export const BOOLEAN_SETTINGS = [
  'is_private', 'profile_public', 'feed_enabled', 'follow_enabled',
  'matching_enabled', 'comment_enabled', 'community_enabled',
  'collection_public', 'like_notif', 'matching_suggestion',
  'support_history_public', 'exclusive_content', 'backer_community',
  'score_public', 'listening_data_use',
] as const

export const SELECT_SETTINGS = {
  follow_request_from: ['全員', '相互フォロー', '誰も受け取らない'],
  dm_from: ['全員', 'フォロワーのみ', '受け取らない'],
  comment_notif_from: ['全員', 'フォロワーのみ', '受け取らない'],
  artist_news: ['全て通知', '重要のみ', '受け取らない'],
} as const

export function validateSettingsPatch(value: unknown): Record<string, boolean | string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const patch = value as Record<string, unknown>
  const keys = Object.keys(patch)
  if (keys.length === 0 || keys.length > BOOLEAN_SETTINGS.length + Object.keys(SELECT_SETTINGS).length) return null
  const result: Record<string, boolean | string> = {}
  for (const key of keys) {
    if ((BOOLEAN_SETTINGS as readonly string[]).includes(key)) {
      if (typeof patch[key] !== 'boolean') return null
      result[key] = patch[key] as boolean
    } else if (Object.prototype.hasOwnProperty.call(SELECT_SETTINGS, key)) {
      const choices = SELECT_SETTINGS[key as keyof typeof SELECT_SETTINGS] as readonly string[]
      if (typeof patch[key] !== 'string' || !choices.includes(patch[key])) return null
      result[key] = patch[key] as string
    } else {
      return null
    }
  }
  return result
}

export async function hasListeningDataOptIn(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.from('user_settings')
    .select('listening_data_use').eq('user_id', userId).maybeSingle()
  return !error && data?.listening_data_use === true
}
