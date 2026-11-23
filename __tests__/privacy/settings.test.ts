import { hasListeningDataOptIn, validateSettingsPatch } from '@/lib/privacy/settings'

describe('privacy settings', () => {
  it('accepts only known, correctly typed settings', () => {
    expect(validateSettingsPatch({ listening_data_use: true, dm_from: 'フォロワーのみ' }))
      .toEqual({ listening_data_use: true, dm_from: 'フォロワーのみ' })
    expect(validateSettingsPatch({ user_id: 'someone-else' })).toBeNull()
    expect(validateSettingsPatch({ listening_data_use: 'true' })).toBeNull()
    expect(validateSettingsPatch({ dm_from: '全員', is_admin: true })).toBeNull()
    expect(validateSettingsPatch({})).toBeNull()
  })

  it('requires a stored affirmative choice and fails closed on lookup errors', async () => {
    function client(data: unknown, error: unknown = null) {
      return { from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }),
      }) } as unknown as Parameters<typeof hasListeningDataOptIn>[0]
    }

    expect(await hasListeningDataOptIn(client(null), 'user-1')).toBe(false)
    expect(await hasListeningDataOptIn(client({ listening_data_use: false }), 'user-1')).toBe(false)
    expect(await hasListeningDataOptIn(client({ listening_data_use: true }, { message: 'database unavailable' }), 'user-1')).toBe(false)
    expect(await hasListeningDataOptIn(client({ listening_data_use: true }), 'user-1')).toBe(true)
  })
})
