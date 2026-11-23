import { normalizeTrackMetadata } from '@/lib/music/metadata'

describe('normalizeTrackMetadata', () => {
  test('オリジナルは権利確認済みを既定値として正規化する', () => {
    expect(normalizeTrackMetadata({})).toMatchObject({
      recording_type: 'original',
      content_category: 'none',
      rights_status: 'original',
      rights_confirmed: true,
    })
  })

  test('カバーは原曲名と権利確認が必要', () => {
    expect(() => normalizeTrackMetadata({ recording_type: 'cover', rights_confirmed: true }))
      .toThrow('原曲・元作品名が必須')
    expect(() => normalizeTrackMetadata({ recording_type: 'cover', source_title: '原曲', rights_confirmed: false }))
      .toThrow('必要な許諾を確認')
  })

  test('二次元コンテンツは作品名が必要', () => {
    expect(() => normalizeTrackMetadata({ content_category: 'anime' }))
      .toThrow('作品・コンテンツ名が必須')
    expect(normalizeTrackMetadata({
      recording_type: 'cover',
      content_category: 'anime',
      source_title: '主題歌',
      source_work_title: '作品名',
      rights_confirmed: true,
      rights_status: 'permission_obtained',
    })).toMatchObject({ source_work_title: '作品名', content_category: 'anime' })
  })

  test('参照URLはhttp/httpsに限定する', () => {
    expect(() => normalizeTrackMetadata({ source_url: 'javascript:alert(1)' }))
      .toThrow('httpまたはhttps')
  })
})
