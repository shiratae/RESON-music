import {
  formatTrackArtistLine,
  normalizeTrackCreditInputs,
  normalizeTrackCredits,
} from '@/lib/music/credits'

describe('track credits', () => {
  test('feat. は参加者クレジットから表示する', () => {
    const credits = normalizeTrackCredits([
      { display_name: '星野ボーカル', role: 'featured_artist', display_order: 0 },
      { display_name: '絵師さん', role: 'illustrator', display_order: 1 },
    ])
    expect(formatTrackArtistLine('メイン作家', credits)).toBe('メイン作家 feat. 星野ボーカル')
  })

  test('入力は表示名・役割・順序へ正規化する', () => {
    expect(normalizeTrackCreditInputs([
      { display_name: '  feat. さん  ', role: 'featured_artist', artist_id: null },
    ])).toEqual([{
      display_name: 'feat. さん',
      role: 'featured_artist',
      artist_id: null,
      display_order: 0,
    }])
  })

  test('不正な役割は拒否する', () => {
    expect(() => normalizeTrackCreditInputs([
      { display_name: '誰か', role: 'not_a_role' },
    ])).toThrow('役割が不正')
  })
})
