'use client'

import { useEffect, useState } from 'react'
import { TRACK_CREDIT_ROLES, type TrackCredit, type TrackCreditRole } from '@/lib/music/credits'
import {
  CONTENT_CATEGORIES,
  RECORDING_TYPES,
  RIGHTS_STATUSES,
  type ContentCategory,
  type RecordingType,
  type RightsStatus,
} from '@/lib/music/metadata'
import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'

interface Distribution {
  year_month: string
  distribution_yen: number
  tips_yen: number
  score_breakdown: {
    play_time_score: number
    support_rate: number
    completion_rate: number
  }
}

interface Track {
  id: string
  title: string
  cumulative_plays: number
  in_distribution: boolean
  ai_generated: boolean
  review_status: 'pending' | 'approved' | 'rejected'
  isrc: string | null
  recording_type: RecordingType
  content_category: ContentCategory
  source_title: string | null
  source_artist_name: string | null
  source_work_title: string | null
  source_url: string | null
  rights_status: RightsStatus
  rights_confirmed: boolean
  rights_note: string | null
  credits: TrackCredit[]
}

interface MetadataDraft {
  recording_type: RecordingType
  content_category: ContentCategory
  source_title: string
  source_artist_name: string
  source_work_title: string
  source_url: string
  rights_status: RightsStatus
  rights_confirmed: boolean
  rights_note: string
  credits: Array<{ artist_id: string | null; display_name: string; role: TrackCreditRole }>
}

interface ReportData {
  artist: { id: string; name: string; review_status: 'pending' | 'approved' | 'rejected'; founding_artist: boolean }
  balance: { balance_yen: number; dormant: boolean }
  distributions: Distribution[]
  tracks: Track[]
}

interface PayoutRequest {
  id: string
  amount_yen: number
  status: 'pending' | 'paid' | 'rejected'
  requested_at: string
}

interface AlbumSummary {
  id: string
  title: string
  released_at: string | null
  release_type: 'single' | 'ep' | 'album'
  cover_r2_key: string | null
}

interface BankAccount {
  bank_name: string
  branch_name: string
  account_type: 'ordinary' | 'checking'
  account_number: string
  account_holder_name: string
}

export default function DashboardPage() {
  const t = useTranslations('Dashboard')
  const metadataT = useTranslations('MusicMetadata')
  const format = useFormatter()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [payoutError, setPayoutError] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [albums, setAlbums] = useState<AlbumSummary[]>([])
  const [lyricsEditingId, setLyricsEditingId] = useState<string | null>(null)
  const [lyricsDraft, setLyricsDraft] = useState('')
  const [lyricsSaving, setLyricsSaving] = useState(false)
  const [isrcEditingId, setIsrcEditingId] = useState<string | null>(null)
  const [isrcDraft, setIsrcDraft] = useState('')
  const [isrcSaving, setIsrcSaving] = useState(false)
  const [isrcError, setIsrcError] = useState('')
  const [metadataEditingId, setMetadataEditingId] = useState<string | null>(null)
  const [metadataDraft, setMetadataDraft] = useState<MetadataDraft | null>(null)
  const [metadataSaving, setMetadataSaving] = useState(false)
  const [metadataError, setMetadataError] = useState('')
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [editingBank, setEditingBank] = useState(false)
  const [bankForm, setBankForm] = useState<BankAccount>({
    bank_name: '', branch_name: '', account_type: 'ordinary', account_number: '', account_holder_name: '',
  })
  const [bankError, setBankError] = useState('')
  const [bankSaved, setBankSaved] = useState(false)

  useEffect(() => {
    fetch('/api/artist/report')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
    fetch('/api/payout/request')
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) => setPayoutRequests(d.requests ?? []))
    fetch('/api/albums?mine=true')
      .then((r) => (r.ok ? r.json() : { albums: [] }))
      .then((d) => setAlbums(d.albums ?? []))
    fetch('/api/artist/bank-account')
      .then((r) => (r.ok ? r.json() : { bank_account: null }))
      .then((d) => setBankAccount(d.bank_account))
  }, [])

  async function saveBankAccount(e: React.FormEvent) {
    e.preventDefault()
    setBankError('')
    const res = await fetch('/api/artist/bank-account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bankForm),
    })
    const body = await res.json()
    if (!res.ok) { setBankError(t('bank.saveFailed')); return }
    setEditingBank(false)
    setBankSaved(true)
    setTimeout(() => setBankSaved(false), 2000)
    fetch('/api/artist/bank-account')
      .then((r) => r.json())
      .then((d) => setBankAccount(d.bank_account))
  }

  function toggleLyricsEditor(trackId: string) {
    if (lyricsEditingId === trackId) {
      setLyricsEditingId(null)
      return
    }
    setLyricsEditingId(trackId)
    setLyricsDraft('')
    fetch(`/api/tracks/${trackId}/lyrics`)
      .then((r) => r.json())
      .then((d) => setLyricsDraft(d.lyrics ?? ''))
  }

  async function saveLyrics(trackId: string) {
    setLyricsSaving(true)
    await fetch(`/api/tracks/${trackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: lyricsDraft }),
    })
    setLyricsSaving(false)
    setLyricsEditingId(null)
  }

  function toggleIsrcEditor(trackId: string, currentIsrc: string | null) {
    setIsrcError('')
    if (isrcEditingId === trackId) {
      setIsrcEditingId(null)
      return
    }
    setIsrcEditingId(trackId)
    setIsrcDraft(currentIsrc ?? '')
  }

  function toggleMetadataEditor(track: Track) {
    setMetadataError('')
    if (metadataEditingId === track.id) {
      setMetadataEditingId(null)
      setMetadataDraft(null)
      return
    }
    setMetadataEditingId(track.id)
    setMetadataDraft({
      recording_type: track.recording_type,
      content_category: track.content_category,
      source_title: track.source_title ?? '',
      source_artist_name: track.source_artist_name ?? '',
      source_work_title: track.source_work_title ?? '',
      source_url: track.source_url ?? '',
      rights_status: track.rights_status,
      rights_confirmed: track.rights_confirmed,
      rights_note: track.rights_note ?? '',
      credits: track.credits.map((credit) => ({
        artist_id: credit.artist_id ?? null,
        display_name: credit.display_name,
        role: credit.role,
      })),
    })
  }

  async function saveMetadata(trackId: string) {
    if (!metadataDraft) return
    setMetadataSaving(true)
    setMetadataError('')
    const res = await fetch(`/api/tracks/${trackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadataDraft),
    })
    setMetadataSaving(false)
    if (!res.ok) {
      setMetadataError(t('metadata.saveFailed'))
      return
    }
    setMetadataEditingId(null)
    setMetadataDraft(null)
    fetch('/api/artist/report').then((r) => r.json()).then((d) => setData(d))
  }

  async function saveIsrc(trackId: string) {
    setIsrcSaving(true)
    setIsrcError('')
    const res = await fetch(`/api/tracks/${trackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isrc: isrcDraft }),
    })
    const body = await res.json()
    setIsrcSaving(false)
    if (!res.ok) { setIsrcError(t('tracks.isrcSaveFailed')); return }
    setIsrcEditingId(null)
    fetch('/api/artist/report').then((r) => r.json()).then((d) => setData(d))
  }

  async function requestPayout() {
    setPayoutError('')
    setPayoutLoading(true)
    const res = await fetch('/api/payout/request', { method: 'POST' })
    const body = await res.json()
    setPayoutLoading(false)
    if (!res.ok) {
      setPayoutError(t('balance.requestFailed'))
      return
    }
    setPayoutRequests((prev) => [body.request, ...prev])
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500">{t('loading')}</p>
      </main>
    )
  }

  if (!data || !data.artist) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">{t('artistRequired')}</p>
          <Link href="/register" className="text-white underline">{t('register')}</Link>
        </div>
      </main>
    )
  }

  const latest = data.distributions[0]

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {data.artist.name}
              {data.artist.founding_artist && (
                <span title={t('foundingArtist')} className="ml-2 text-yellow-400">★</span>
              )}
            </h1>
            <p className="text-sm text-zinc-400">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/supporters"
              className="text-sm border border-zinc-700 px-4 py-2 rounded-lg font-semibold hover:border-zinc-400 transition"
            >
              {t('supporters')}
            </Link>
            <Link
              href="/report"
              className="text-sm border border-zinc-700 px-4 py-2 rounded-lg font-semibold hover:border-zinc-400 transition"
            >
              {t('report')}
            </Link>
            <Link
              href="/upload"
              className="text-sm bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition"
            >
              {t('upload')}
            </Link>
          </div>
        </div>

        {/* 審査ステータス */}
        {data.artist.review_status === 'pending' && (
          <div className="bg-zinc-900 border border-yellow-800 rounded-2xl p-4 text-sm text-yellow-400">
            {t('review.pending')}
          </div>
        )}
        {data.artist.review_status === 'rejected' && (
          <div className="bg-zinc-900 border border-red-800 rounded-2xl p-4 text-sm text-red-400">
            {t('review.rejected')}
          </div>
        )}

        {/* 残高カード */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-sm text-zinc-400">{t('balance.title')}</p>
          <p className="text-4xl font-bold mt-1">
            ¥{Math.floor(data.balance.balance_yen).toLocaleString()}
          </p>
          {data.balance.balance_yen >= 1000 ? (
            <p className="text-xs text-zinc-500 mt-2">{t('balance.schedule')}</p>
          ) : (
            <p className="text-xs text-zinc-600 mt-2">{t('balance.minimum')}</p>
          )}
          {data.balance.balance_yen >= 50000 && (
            <p className="text-xs text-yellow-500 mt-2">{t('balance.warning')}</p>
          )}

          {payoutError && (
            <p className="text-xs text-red-400 mt-3">{payoutError}</p>
          )}

          {payoutRequests.some((r) => r.status === 'pending') ? (
            <p className="text-xs text-zinc-500 mt-3">{t('balance.pending')}</p>
          ) : (
            <button
              onClick={requestPayout}
              disabled={data.balance.balance_yen < 1000 || payoutLoading}
              className="mt-3 text-sm bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-zinc-200 disabled:opacity-40 transition"
            >
              {payoutLoading ? t('balance.requesting') : t('balance.request')}
            </button>
          )}

          {payoutRequests.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3">
              {payoutRequests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex justify-between text-xs text-zinc-500">
                  <span>{format.dateTime(new Date(r.requested_at), { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span>¥{Math.floor(r.amount_yen).toLocaleString()}</span>
                  <span>
                    {r.status === 'pending' ? t('payoutStatus.pending') : r.status === 'paid' ? t('payoutStatus.paid') : t('payoutStatus.rejected')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最新月のスコア内訳 */}
        {latest && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('score.title', { month: latest.year_month })}</h2>
              <p className="text-sm text-zinc-400">
                ¥{Math.floor(latest.distribution_yen).toLocaleString()}
              </p>
            </div>
            <div className="space-y-3">
              <ScoreBar
                label={t('score.playTime')}
                value={latest.score_breakdown.play_time_score}
                weight={0.4}
                desc={t('score.playTimeDesc')}
              />
              <ScoreBar
                label={t('score.support')}
                value={latest.score_breakdown.support_rate * 100}
                weight={0.35}
                isPercent
                desc={t('score.supportDesc')}
              />
              <ScoreBar
                label={t('score.completion')}
                value={latest.score_breakdown.completion_rate * 100}
                weight={0.25}
                isPercent
                desc={t('score.completionDesc')}
              />
            </div>
            <p className="text-xs text-zinc-600 border-t border-zinc-800 pt-3">
              {t('score.tips', { amount: latest.tips_yen ?? 0 })}
            </p>
          </div>
        )}

        {/* 月次履歴 */}
        {data.distributions.length > 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold">{t('historyTitle')}</h2>
            {data.distributions.map((d) => (
              <div key={d.year_month} className="flex justify-between text-sm border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                <span className="text-zinc-300">{d.year_month}</span>
                <span>¥{Math.floor(d.distribution_yen).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* 楽曲リスト */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold">{t('tracks.title')}</h2>
          {data.tracks.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('tracks.empty')}</p>
          ) : (
            data.tracks.map((track) => (
              <div key={track.id} className="border-b border-zinc-800 pb-2 last:border-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{track.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">{metadataT(`recordingTypes.${track.recording_type}`)}</span>
                      {track.content_category !== 'none' && <span className="text-xs text-zinc-500">{metadataT(`contentCategories.${track.content_category}`)}</span>}
                      {track.review_status === 'pending' && (
                        <span className="text-xs text-yellow-500">{t('tracks.pending')}</span>
                      )}
                      {track.review_status === 'rejected' && (
                        <span className="text-xs text-red-400">{t('tracks.rejected')}</span>
                      )}
                      {track.ai_generated && (
                        <span className="text-xs text-yellow-600">{t('tracks.ai')}</span>
                      )}
                      {!track.in_distribution && (
                        <span className="text-xs text-zinc-600">
                          {t('tracks.notEligible', { count: track.cumulative_plays })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      ISRC: {track.isrc ?? t('tracks.isrcMissing')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => toggleIsrcEditor(track.id, track.isrc)}
                      className="text-xs text-zinc-500 hover:text-white underline"
                    >
                      ISRC
                    </button>
                    <button
                      onClick={() => toggleMetadataEditor(track)}
                      className="text-xs text-zinc-500 hover:text-white underline"
                    >
                      {metadataT('edit')}
                    </button>
                    <button
                      onClick={() => toggleLyricsEditor(track.id)}
                      className="text-xs text-zinc-500 hover:text-white underline"
                    >
                      {t('tracks.lyrics')}
                    </button>
                    <span className="text-zinc-400">
                      {t('tracks.plays', { count: track.cumulative_plays })}
                    </span>
                  </div>
                </div>
                {isrcEditingId === track.id && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={isrcDraft}
                      onChange={(e) => setIsrcDraft(e.target.value)}
                      placeholder={t('tracks.isrcPlaceholder')}
                      maxLength={15}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                    />
                    {isrcError && <p className="text-xs text-red-400">{isrcError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveIsrc(track.id)}
                        disabled={isrcSaving}
                        className="text-xs rounded-lg bg-white text-black px-3 py-1.5 font-semibold disabled:opacity-40"
                      >
                        {isrcSaving ? t('tracks.saving') : t('tracks.save')}
                      </button>
                      <button
                        onClick={() => setIsrcEditingId(null)}
                        className="text-xs rounded-lg border border-zinc-700 px-3 py-1.5"
                      >
                        {t('tracks.close')}
                      </button>
                    </div>
                  </div>
                )}
                {metadataEditingId === track.id && metadataDraft && (
                  <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-zinc-400">
                        {metadataT('recordingType')}
                        <select
                          value={metadataDraft.recording_type}
                          onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, recording_type: e.target.value as RecordingType, rights_status: e.target.value === 'original' ? 'original' : prev.rights_status === 'original' ? 'permission_obtained' : prev.rights_status })}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white"
                        >
                          {RECORDING_TYPES.map((type) => <option key={type} value={type}>{metadataT(`recordingTypes.${type}`)}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-zinc-400">
                        {metadataT('contentCategory')}
                        <select
                          value={metadataDraft.content_category}
                          onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, content_category: e.target.value as ContentCategory })}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white"
                        >
                          {CONTENT_CATEGORIES.map((category) => <option key={category} value={category}>{metadataT(`contentCategories.${category}`)}</option>)}
                        </select>
                      </label>
                    </div>
                    {(metadataDraft.recording_type !== 'original' || metadataDraft.content_category !== 'none') && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input value={metadataDraft.source_title} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, source_title: e.target.value })} placeholder={metadataT('sourceTitlePlaceholder')} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white placeholder-zinc-600" />
                        <input value={metadataDraft.source_artist_name} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, source_artist_name: e.target.value })} placeholder={metadataT('sourceArtistNamePlaceholder')} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white placeholder-zinc-600" />
                        <input value={metadataDraft.source_work_title} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, source_work_title: e.target.value })} placeholder={metadataT('sourceWorkTitlePlaceholder')} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white placeholder-zinc-600" />
                        <input value={metadataDraft.source_url} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, source_url: e.target.value })} placeholder={metadataT('sourceUrl')} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white placeholder-zinc-600" />
                      </div>
                    )}
                    {metadataDraft.recording_type !== 'original' && (
                      <select value={metadataDraft.rights_status} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, rights_status: e.target.value as RightsStatus })} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white">
                        {RIGHTS_STATUSES.filter((status) => status !== 'original').map((status) => <option key={status} value={status}>{metadataT(`rightsStatuses.${status}`)}</option>)}
                      </select>
                    )}
                    <label className="flex items-start gap-2 text-xs text-zinc-400">
                      <input type="checkbox" checked={metadataDraft.rights_confirmed} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, rights_confirmed: e.target.checked })} className="mt-0.5 h-4 w-4 rounded accent-white" />
                      <span>{metadataT('rightsNotice')}</span>
                    </label>
                    <textarea value={metadataDraft.rights_note} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, rights_note: e.target.value })} rows={2} maxLength={1000} aria-label={metadataT('rightsNote')} placeholder={metadataT('rightsNotePlaceholder')} className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white placeholder-zinc-600" />

                    <div className="space-y-2 border-t border-zinc-800 pt-3">
                      <p className="text-xs text-zinc-400">{metadataT('credits')}</p>
                      {metadataDraft.credits.map((credit, index) => (
                        <div key={`${credit.display_name}-${index}`} className="flex gap-2">
                          <select value={credit.role} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, credits: prev.credits.map((item, i) => i === index ? { ...item, role: e.target.value as TrackCreditRole } : item) })} className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white">
                            {TRACK_CREDIT_ROLES.map((role) => <option key={role} value={role}>{metadataT(`creditRoles.${role}`)}</option>)}
                          </select>
                          <input value={credit.display_name} onChange={(e) => setMetadataDraft((prev) => prev && { ...prev, credits: prev.credits.map((item, i) => i === index ? { ...item, display_name: e.target.value, artist_id: null } : item) })} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white" />
                          <button type="button" onClick={() => setMetadataDraft((prev) => prev && { ...prev, credits: prev.credits.filter((_, i) => i !== index) })} className="text-xs text-zinc-500 underline hover:text-white">{metadataT('remove')}</button>
                        </div>
                      ))}
                      {metadataDraft.credits.length < 20 && (
                        <button type="button" onClick={() => setMetadataDraft((prev) => prev && { ...prev, credits: [...prev.credits, { artist_id: null, display_name: '', role: 'featured_artist' }] })} className="text-xs text-zinc-400 underline hover:text-white">{metadataT('addCredit')}</button>
                      )}
                    </div>
                    {metadataError && <p className="text-xs text-red-400">{metadataError}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveMetadata(track.id)} disabled={metadataSaving} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40">{metadataSaving ? metadataT('saving') : metadataT('save')}</button>
                      <button type="button" onClick={() => { setMetadataEditingId(null); setMetadataDraft(null) }} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs">{metadataT('close')}</button>
                    </div>
                    <p className="text-[11px] leading-5 text-zinc-600">{metadataT('reReviewNote')}</p>
                  </div>
                )}
                {lyricsEditingId === track.id && (
                  <div className="space-y-2">
                    <textarea
                      value={lyricsDraft}
                      onChange={(e) => setLyricsDraft(e.target.value)}
                      rows={6}
                      maxLength={10000}
                      placeholder={t('tracks.lyricsPlaceholder')}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveLyrics(track.id)}
                        disabled={lyricsSaving}
                        className="text-xs rounded-lg bg-white text-black px-3 py-1.5 font-semibold disabled:opacity-40"
                      >
                        {lyricsSaving ? t('tracks.saving') : t('tracks.save')}
                      </button>
                      <button
                        onClick={() => setLyricsEditingId(null)}
                        className="text-xs rounded-lg border border-zinc-700 px-3 py-1.5"
                      >
                        {t('tracks.close')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 出金先銀行口座 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('bank.title')}</h2>
            <button
              onClick={() => {
                if (bankAccount) setBankForm(bankAccount)
                setEditingBank((v) => !v)
              }}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              {editingBank ? t('bank.cancel') : t('bank.edit')}
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            {t('bank.description')}
          </p>

          {!editingBank ? (
            bankAccount ? (
              <div className="text-sm text-zinc-300 space-y-1">
                <p>{bankAccount.bank_name} {bankAccount.branch_name}</p>
                <p>{bankAccount.account_type === 'ordinary' ? t('bank.ordinary') : t('bank.checking')} {bankAccount.account_number}</p>
                <p className="text-zinc-500">{bankAccount.account_holder_name}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{t('bank.empty')}</p>
            )
          ) : (
            <form onSubmit={saveBankAccount} className="space-y-2">
              <input
                aria-label={t('bank.bankName')}
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                placeholder={t('bank.bankName')}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              <input
                aria-label={t('bank.branchName')}
                value={bankForm.branch_name}
                onChange={(e) => setBankForm({ ...bankForm, branch_name: e.target.value })}
                placeholder={t('bank.branchName')}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              <select
                aria-label={t('bank.accountType')}
                value={bankForm.account_type}
                onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value as 'ordinary' | 'checking' })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              >
                <option value="ordinary">{t('bank.ordinary')}</option>
                <option value="checking">{t('bank.checking')}</option>
              </select>
              <input
                aria-label={t('bank.accountNumber')}
                value={bankForm.account_number}
                onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                placeholder={t('bank.accountNumber')}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              <input
                aria-label={t('bank.holderName')}
                value={bankForm.account_holder_name}
                onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                placeholder={t('bank.holderPlaceholder')}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              {bankError && <p className="text-xs text-red-400">{bankError}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                {t('tracks.save')}
              </button>
            </form>
          )}
          {bankSaved && <p className="text-xs text-emerald-400">{t('bank.saved')}</p>}
        </div>

        {/* アルバム */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('albums.title')}</h2>
            <Link href="/upload" className="text-xs text-zinc-400 hover:text-white underline">
              {t('albums.createOnUpload')}
            </Link>
          </div>
          {albums.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('albums.empty')}</p>
          ) : (
            albums.map((a) => (
              <Link
                key={a.id}
                href={`/albums?id=${a.id}`}
                className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 last:border-0 last:pb-0 hover:text-white"
              >
                <span className="flex items-center gap-2 truncate">
                  {a.cover_r2_key ? (
                    <img src={`/api/albums/${a.id}/cover`} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <span className="h-8 w-8 rounded bg-zinc-800 shrink-0" />
                  )}
                  <span className="truncate">
                    {a.title}
                    <span className="ml-2 text-xs text-zinc-500">{t(`releaseType.${a.release_type}`)}</span>
                  </span>
                </span>
                <span className="text-zinc-500 text-xs">
                  {a.released_at ? format.dateTime(new Date(a.released_at), { year: 'numeric', month: 'short', day: 'numeric' }) : t('albums.unreleased')}
                </span>
              </Link>
            ))
          )}
        </div>

        {/* 紹介・透明性リンク */}
        <p className="text-center text-xs text-zinc-600 space-x-4">
          <Link href="/invite" className="hover:text-zinc-400 underline">
            {t('invite')}
          </Link>
          <Link href="/pricing" className="hover:text-zinc-400 underline">
            {t('pricing')}
          </Link>
        </p>
      </div>
    </main>
  )
}

function ScoreBar({
  label, value, weight, isPercent = false, desc,
}: {
  label: string
  value: number
  weight: number
  isPercent?: boolean
  desc: string
}) {
  const display = isPercent
    ? `${value.toFixed(1)}%`
    : value.toFixed(4)
  const pct = isPercent ? Math.min(value, 100) : Math.min(value * 100, 100)

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>
          {label}
          <span className="text-zinc-500 ml-1.5 text-xs">× {weight}</span>
        </span>
        <span className="text-zinc-300">{display}</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div className="bg-white h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-zinc-600 mt-0.5">{desc}</p>
    </div>
  )
}
