'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Player } from '@/components/Player'
import { usePlayerQueue } from '@/lib/player/queue'
import type { TrackCredit } from '@/lib/music/credits'
import type { RecordingType } from '@/lib/music/metadata'

interface AlbumTrack {
  id: string
  title: string
  duration_sec: number
  track_number: number | null
  cumulative_plays: number
  ai_generated: boolean
  recording_type?: string
  content_category?: string
  artists: { id: string; name: string } | null
  credits?: TrackCredit[]
}

interface AlbumDetail {
  album: {
    id: string
    title: string
    cover_url: string | null
    cover_r2_key: string | null
    released_at: string | null
    release_type: 'single' | 'ep' | 'album'
    artists: { id: string; name: string } | null
  }
  tracks: AlbumTrack[]
  total_duration_sec: number
}

function AlbumDetailContent() {
  const t = useTranslations('Album')
  const metadataT = useTranslations('MusicMetadata')
  const format = useFormatter()
  const searchParams = useSearchParams()
  const albumId = searchParams.get('id') ?? ''
  const [data, setData] = useState<AlbumDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const queue = usePlayerQueue(data?.tracks ?? [])

  useEffect(() => {
    if (!albumId) { setLoading(false); return }
    fetch(`/api/albums/${albumId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [albumId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--faint)]">
        {t('loading')}
      </div>
    )
  }

  if (!data || !data.album) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--faint)]">
        {t('notFound')}
      </div>
    )
  }

  const { album, tracks, total_duration_sec } = data
  const current = queue.current
  const currentIdx = queue.baseIndex
  const nextTrackId = queue.queue[0]?.id ?? (queue.shuffleOn ? undefined : tracks[currentIdx + 1]?.id)
  const releaseTypeLabel = t(`releaseType.${album.release_type}`)
  const duration = t('duration', { minutes: Math.floor(total_duration_sec / 60), seconds: total_duration_sec % 60 })

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
          {t('backHome')}
        </Link>

        <div className="flex gap-4">
          {(album.cover_r2_key || album.cover_url) && (
            <img
              src={album.cover_r2_key ? `/api/albums/${album.id}/cover` : album.cover_url!}
              alt={album.title}
              className="h-24 w-24 shrink-0 rounded-lg object-cover border border-[var(--line)]"
            />
          )}
          <div>
            <span className="text-xs rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--dim)]">
              {releaseTypeLabel}
            </span>
            <h1 className="font-display mt-2 text-2xl font-bold">{album.title}</h1>
            <p className="mt-1 text-sm text-[var(--dim)]">{album.artists?.name ?? t('unknownArtist')}</p>
            <p className="mt-1 text-xs text-[var(--faint)]">
              {t('summary', { count: tracks.length, duration })}
              {album.released_at && <> · {format.dateTime(new Date(album.released_at), { year: 'numeric', month: 'short', day: 'numeric' })}</>}
            </p>
          </div>
        </div>

        {current && (
          <Player
            track={{
              id: current.id,
              title: current.title,
              duration_sec: current.duration_sec,
              artists: current.artists ?? album.artists,
              credits: current.credits,
            }}
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

        <div className="space-y-1">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl transition ${
                i === currentIdx ? 'bg-[var(--surface)]' : 'hover:bg-[var(--panel)]'
              }`}
            >
              <button onClick={() => queue.playAt(i)} className="flex-1 flex items-center justify-between min-w-0 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-[var(--faint)] w-5 shrink-0">{track.track_number ?? i + 1}</span>
                  <span className={`truncate text-sm font-medium ${i === currentIdx ? 'text-[var(--accent)]' : ''}`}>
                    {track.title}
                    {track.ai_generated && <span className="ml-2 text-xs text-yellow-500">AI</span>}
                    {track.recording_type && track.recording_type !== 'original' && (
                      <span className="ml-2 text-xs text-[var(--accent)]">{metadataT(`recordingTypes.${track.recording_type as RecordingType}`)}</span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-[var(--faint)] shrink-0 ml-3">
                  {Math.floor(track.duration_sec / 60)}:{String(track.duration_sec % 60).padStart(2, '0')}
                </span>
              </button>
              <button
                onClick={() => queue.addToQueue(track)}
                title={t('addQueueTitle')}
                className="shrink-0 text-xs text-[var(--faint)] hover:text-[var(--text)] px-2"
              >
                {t('addQueue')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AlbumDetailPage() {
  return (
    <Suspense>
      <AlbumDetailContent />
    </Suspense>
  )
}
