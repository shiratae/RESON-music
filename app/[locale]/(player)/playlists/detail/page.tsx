'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Player } from '@/components/Player'
import { usePlayerQueue } from '@/lib/player/queue'
import { formatTrackArtistLine, type TrackCredit } from '@/lib/music/credits'

interface PlaylistTrackRow {
  position: number
  track_id: string
  tracks: {
    id: string
    title: string
    duration_sec: number
    ai_generated: boolean
    artists: { id: string; name: string } | null
    credits?: TrackCredit[]
  } | null
}

interface PlaylistDetail {
  playlist: { id: string; user_id: string; title: string; is_public: boolean }
  tracks: PlaylistTrackRow[]
  is_owner: boolean
}

interface SearchTrack {
  id: string
  title: string
  duration_sec: number
  artists: { id: string; name: string } | null
}

function PlaylistDetailContent() {
  const t = useTranslations('PlaylistDetail')
  const searchParams = useSearchParams()
  const router = useRouter()
  const playlistId = searchParams.get('id') ?? ''
  const [data, setData] = useState<PlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchTrack[]>([])
  const [error, setError] = useState('')

  const flatTracks = (data?.tracks ?? [])
    .filter((r) => r.tracks)
    .map((r) => r.tracks!)

  const queue = usePlayerQueue(flatTracks)

  useEffect(() => {
    if (!playlistId) { setLoading(false); return }
    load()
  }, [playlistId])

  function load() {
    fetch(`/api/playlists/${playlistId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/tracks/list?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.tracks ?? []))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function addTrack(trackId: string) {
    setError('')
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId }),
    })
    const body = await res.json()
    if (!res.ok) { setError(t('addFailed')); return }
    setSearchQuery('')
    setSearchResults([])
    load()
  }

  async function removeTrack(trackId: string) {
    await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId }),
    })
    load()
  }

  async function move(index: number, dir: -1 | 1) {
    const ids = flatTracks.map((t) => t.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_ids: ids }),
    })
    load()
  }

  async function deletePlaylist() {
    await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' })
    router.push('/playlists')
  }

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--faint)]">{t('loading')}</div>
  }
  if (!data || !data.playlist) {
    return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--faint)]">{t('notFound')}</div>
  }

  const { playlist } = data
  const isOwner = data.is_owner
  const current = queue.current
  const currentIdx = queue.baseIndex
  const nextTrackId = queue.queue[0]?.id ?? (queue.shuffleOn ? undefined : flatTracks[currentIdx + 1]?.id)

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/playlists" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
          {t('back')}
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{playlist.title}</h1>
          {isOwner && (
            <button onClick={deletePlaylist} className="text-xs text-red-400 hover:text-red-300">
              {t('delete')}
            </button>
          )}
        </div>

        {current && (
          <Player
            track={current}
            onEnded={queue.playNext}
            nextTrackId={nextTrackId}
            controls={{
              onPrev: queue.playPrev,
              onNext: queue.playNext,
              hasNext: queue.hasNext,
              hasPrev: currentIdx > 0,
              shuffleOn: queue.shuffleOn,
              onToggleShuffle: queue.toggleShuffle,
              repeatMode: queue.repeatMode,
              onCycleRepeat: queue.cycleRepeat,
              queueCount: queue.queue.length,
            }}
          />
        )}

        {isOwner && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <input
              aria-label={t('searchLabel')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {searchResults.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => addTrack(track.id)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface)]"
                  >
                    {track.title} <span className="text-[var(--faint)]">{t('separator')} {track.artists?.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          {flatTracks.length === 0 ? (
            <p className="text-sm text-[var(--faint)] text-center py-8">{t('empty')}</p>
          ) : (
            flatTracks.map((track, i) => (
              <div
                key={track.id}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition ${
                  i === currentIdx ? 'bg-[var(--surface)]' : 'hover:bg-[var(--panel)]'
                }`}
              >
                <button onClick={() => queue.playAt(i)} className="flex-1 min-w-0 text-left">
                  <p className={`truncate text-sm font-medium ${i === currentIdx ? 'text-[var(--accent)]' : ''}`}>
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-[var(--dim)]">{formatTrackArtistLine(track.artists?.name, track.credits, t('unknownArtist'))}</p>
                </button>
                <button onClick={() => queue.addToQueue(track)} title={t('addQueueTitle')} className="text-xs text-[var(--faint)] hover:text-[var(--text)]">
                  {t('addQueue')}
                </button>
                {isOwner && (
                  <>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-[var(--dim)] disabled:opacity-30">▲</button>
                    <button onClick={() => move(i, 1)} disabled={i === flatTracks.length - 1} className="text-xs text-[var(--dim)] disabled:opacity-30">▼</button>
                    <button onClick={() => removeTrack(track.id)} className="text-xs text-red-400">✕</button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function PlaylistDetailPage() {
  return (
    <Suspense>
      <PlaylistDetailContent />
    </Suspense>
  )
}
