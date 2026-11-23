'use client'

import { useEffect, useState } from 'react'
import type { TrackCredit } from '@/lib/music/credits'
import type { ContentCategory, RecordingType } from '@/lib/music/metadata'
import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'

type Tab = 'artists' | 'tracks' | 'fraud' | 'reports' | 'payouts' | 'founding'

interface PendingArtist {
  id: string
  name: string
  bio: string | null
  is_minor: boolean
  created_at: string
}

interface PendingTrack {
  id: string
  title: string
  ai_generated: boolean
  created_at: string
  artists: { id: string; name: string } | null
  recording_type: RecordingType
  content_category: ContentCategory
  source_title: string | null
  source_artist_name: string | null
  source_work_title: string | null
  source_url: string | null
  rights_status: string
  rights_confirmed: boolean
  rights_note: string | null
  credits: TrackCredit[]
}

interface FraudFlag {
  id: string
  track_id: string
  user_id: string
  flag_type: string
  level: number
  created_at: string
  tracks: { id: string; title: string; fraud_suspended: boolean } | null
}

interface Report {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  status: string
  created_at: string
}

interface PayoutRequest {
  id: string
  artist_id: string
  amount_yen: number
  status: string
  requested_at: string
  artists: { id: string; name: string } | null
}

const TABS: Tab[] = ['artists', 'tracks', 'fraud', 'reports', 'payouts', 'founding']

interface ArtistSearchResult {
  id: string
  name: string
  review_status: string
  founding_artist: boolean
}

export default function AdminPage() {
  const t = useTranslations('Admin')
  const metadataT = useTranslations('MusicMetadata')
  const format = useFormatter()
  const [authState, setAuthState] = useState<'checking' | 'denied' | 'ok'>('checking')
  const [tab, setTab] = useState<Tab>('artists')

  const [artists, setArtists] = useState<PendingArtist[]>([])
  const [tracks, setTracks] = useState<PendingTrack[]>([])
  const [flags, setFlags] = useState<FraudFlag[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [foundingQuery, setFoundingQuery] = useState('')
  const [foundingResults, setFoundingResults] = useState<ArtistSearchResult[]>([])

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setAuthState(d.is_admin ? 'ok' : 'denied'))
  }, [])

  useEffect(() => {
    if (authState !== 'ok') return
    loadAll()
  }, [authState])

  function loadAll() {
    fetch('/api/admin/artists').then((r) => r.json()).then((d) => setArtists(d.artists ?? []))
    fetch('/api/admin/tracks').then((r) => r.json()).then((d) => setTracks(d.tracks ?? []))
    fetch('/api/admin/fraud-flags').then((r) => r.json()).then((d) => setFlags(d.flags ?? []))
    fetch('/api/admin/reports').then((r) => r.json()).then((d) => setReports(d.reports ?? []))
    fetch('/api/admin/payouts').then((r) => r.json()).then((d) => setPayouts(d.requests ?? []))
  }

  async function reviewArtist(id: string, action: 'approved' | 'rejected') {
    await fetch('/api/admin/artists/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_id: id, action }),
    })
    setArtists((prev) => prev.filter((a) => a.id !== id))
  }

  async function reviewTrack(id: string, action: 'approved' | 'rejected') {
    await fetch('/api/admin/tracks/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: id, action }),
    })
    setTracks((prev) => prev.filter((t) => t.id !== id))
  }

  async function resolveFlag(id: string, unsuspend: boolean) {
    await fetch('/api/admin/fraud-flags/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, unsuspend }),
    })
    setFlags((prev) => prev.filter((f) => f.id !== id))
  }

  async function resolveReport(id: string, status: 'reviewed' | 'dismissed') {
    await fetch('/api/admin/reports/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  async function processPayout(id: string, action: 'paid' | 'rejected') {
    await fetch('/api/admin/payouts/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: id, action }),
    })
    setPayouts((prev) => prev.filter((p) => p.id !== id))
  }

  async function searchFoundingArtists() {
    if (!foundingQuery.trim()) { setFoundingResults([]); return }
    const res = await fetch(`/api/admin/artists/search?q=${encodeURIComponent(foundingQuery)}`)
    const data = await res.json()
    setFoundingResults(data.artists ?? [])
  }

  async function toggleFounding(artistId: string, next: boolean) {
    await fetch('/api/admin/artists/founding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_id: artistId, founding_artist: next }),
    })
    setFoundingResults((prev) => prev.map((a) => (a.id === artistId ? { ...a, founding_artist: next } : a)))
  }

  if (authState === 'checking') {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center text-zinc-500">{t('checking')}</main>
  }
  if (authState === 'denied') {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center text-zinc-500">{t('denied')}</main>
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/admin/privacy-requests" className="inline-block text-sm text-zinc-300 underline hover:text-white">{t('privacy')}</Link>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`shrink-0 text-sm px-3 py-1.5 rounded-lg border transition ${
                tabKey === tab ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {t(`tabs.${tabKey}`)}
              {tabKey === 'artists' && artists.length > 0 && ` (${artists.length})`}
              {tabKey === 'tracks' && tracks.length > 0 && ` (${tracks.length})`}
              {tabKey === 'fraud' && flags.length > 0 && ` (${flags.length})`}
              {tabKey === 'reports' && reports.length > 0 && ` (${reports.length})`}
              {tabKey === 'payouts' && payouts.length > 0 && ` (${payouts.length})`}
            </button>
          ))}
        </div>

        {tab === 'artists' && (
          <div className="space-y-2">
            {artists.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('artists.empty')}</p>
            ) : (
              artists.map((a) => (
                <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.name}{a.is_minor && <span className="ml-2 text-xs text-yellow-500">{t('artists.minor')}</span>}</p>
                    <p className="text-xs text-zinc-500">{format.dateTime(new Date(a.created_at), { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  {a.bio && <p className="text-sm text-zinc-400">{a.bio}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => reviewArtist(a.id, 'approved')} className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold">{t('artists.approve')}</button>
                    <button onClick={() => reviewArtist(a.id, 'rejected')} className="text-xs border border-red-800 text-red-400 px-3 py-1.5 rounded-lg">{t('artists.reject')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'tracks' && (
          <div className="space-y-2">
            {tracks.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('tracks.empty')}</p>
            ) : (
              tracks.map((track) => (
                <div key={track.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {track.title}
                      {track.ai_generated && <span className="ml-2 text-xs text-yellow-500">{t('tracks.ai')}</span>}
                    </p>
                    <p className="text-xs text-zinc-500">{format.dateTime(new Date(track.created_at), { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p className="text-sm text-zinc-400">{track.artists?.name ?? t('tracks.unknown')}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">{metadataT(`recordingTypes.${track.recording_type}`)}</span>
                    {track.content_category !== 'none' && <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-yellow-300">{metadataT(`contentCategories.${track.content_category}`)}</span>}
                    <span className={track.rights_confirmed ? 'text-emerald-400' : 'text-red-400'}>{track.rights_confirmed ? t('tracks.rightsConfirmed') : t('tracks.rightsNotConfirmed')}</span>
                  </div>
                  {(track.source_title || track.source_work_title || track.source_artist_name) && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                      <p>{t('tracks.source')}: {track.source_title ?? t('tracks.notEntered')}{track.source_artist_name ? ` / ${track.source_artist_name}` : ''}</p>
                      {track.source_work_title && <p className="mt-1">{t('tracks.work')}: {track.source_work_title}</p>}
                      {track.source_url && <p className="mt-1 break-all text-zinc-600">{track.source_url}</p>}
                      {track.rights_note && <p className="mt-1">{t('tracks.note')}: {track.rights_note}</p>}
                    </div>
                  )}
                  {track.credits.length > 0 && (
                    <p className="text-xs text-zinc-500">
                      {t('tracks.credits')}: {track.credits.map((credit) => `${metadataT(`creditRoles.${credit.role}`)} ${credit.display_name}`).join(' / ')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => reviewTrack(track.id, 'approved')} className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold">{t('tracks.approve')}</button>
                    <button onClick={() => reviewTrack(track.id, 'rejected')} className="text-xs border border-red-800 text-red-400 px-3 py-1.5 rounded-lg">{t('tracks.reject')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'fraud' && (
          <div className="space-y-2">
            {flags.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('fraud.empty')}</p>
            ) : (
              flags.map((f) => (
                <div key={f.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {f.flag_type}
                      <span className="ml-2 text-xs text-zinc-500">level {f.level}</span>
                      {f.tracks?.fraud_suspended && <span className="ml-2 text-xs text-red-400">{t('fraud.suspended')}</span>}
                    </p>
                    <p className="text-xs text-zinc-500">{format.dateTime(new Date(f.created_at), { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p className="text-sm text-zinc-400">{f.tracks?.title ?? t('fraud.unknownTrack')}</p>
                  <div className="flex gap-2">
                    <button onClick={() => resolveFlag(f.id, false)} className="text-xs border border-zinc-700 px-3 py-1.5 rounded-lg">
                      {t('fraud.resolve')}
                    </button>
                    {f.tracks?.fraud_suspended && (
                      <button onClick={() => resolveFlag(f.id, true)} className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold">
                        {t('fraud.resume')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('reports.empty')}</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.target_type}</p>
                    <p className="text-xs text-zinc-500">{format.dateTime(new Date(r.created_at), { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p className="text-sm text-zinc-400">{r.reason}</p>
                  <div className="flex gap-2">
                    <button onClick={() => resolveReport(r.id, 'reviewed')} className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold">{t('reports.reviewed')}</button>
                    <button onClick={() => resolveReport(r.id, 'dismissed')} className="text-xs border border-zinc-700 px-3 py-1.5 rounded-lg">{t('reports.dismissed')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="space-y-2">
            {payouts.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('payouts.empty')}</p>
            ) : (
              payouts.map((p) => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.artists?.name ?? t('payouts.unknown')}</p>
                    <p className="text-sm">¥{Math.floor(p.amount_yen).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-zinc-500">{format.dateTime(new Date(p.requested_at), { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  <div className="flex gap-2">
                    <button onClick={() => processPayout(p.id, 'paid')} className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold">{t('payouts.paid')}</button>
                    <button onClick={() => processPayout(p.id, 'rejected')} className="text-xs border border-red-800 text-red-400 px-3 py-1.5 rounded-lg">{t('payouts.reject')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'founding' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              {t('founding.description')}
            </p>
            <div className="flex gap-2">
              <input
                aria-label={t('founding.searchAria')}
                value={foundingQuery}
                onChange={(e) => setFoundingQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchFoundingArtists() }}
                placeholder={t('founding.placeholder')}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
              />
              <button onClick={searchFoundingArtists} className="text-xs border border-zinc-700 px-4 py-2 rounded-lg">{t('founding.search')}</button>
            </div>
            <div className="space-y-2">
              {foundingResults.map((a) => (
                <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <p className="font-medium">
                    {a.name}
                    {a.founding_artist && <span className="ml-2 text-yellow-400">{t('founding.badge')}</span>}
                  </p>
                  <button
                    onClick={() => toggleFounding(a.id, !a.founding_artist)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                      a.founding_artist ? 'border border-zinc-700 text-zinc-300' : 'bg-white text-black'
                    }`}
                  >
                    {a.founding_artist ? t('founding.remove') : t('founding.add')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
