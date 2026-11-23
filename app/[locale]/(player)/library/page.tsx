'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Player } from '@/components/Player'
import { usePlayerQueue } from '@/lib/player/queue'
import { formatTrackArtistLine, type TrackCredit } from '@/lib/music/credits'

interface LikedTrack {
  id: string
  title: string
  duration_sec: number
  ai_generated: boolean
  artists: { id: string; name: string } | null
  recording_type?: string
  content_category?: string
  credits?: TrackCredit[]
}

export default function LibraryPage() {
  const tr = useTranslations('Library')
  const [tracks, setTracks] = useState<LikedTrack[]>([])
  const [loading, setLoading] = useState(true)
  const queue = usePlayerQueue(tracks)

  useEffect(() => {
    fetch('/api/library/liked-tracks')
      .then((r) => r.json())
      .then((d) => { setTracks(d.tracks ?? []); setLoading(false) })
  }, [])

  const current = queue.current
  const currentIdx = queue.baseIndex
  const nextTrackId = queue.queue[0]?.id ?? (queue.shuffleOn ? undefined : tracks[currentIdx + 1]?.id)

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{tr('title')}</h1>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {tr('home')}
          </Link>
        </div>
        <p className="text-xs text-[var(--faint)]">{tr('description')}</p>

        {loading ? (
          <p className="text-sm text-[var(--faint)]">{tr('loading')}</p>
        ) : (
          <>
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

            <div className="space-y-1">
              {tracks.length === 0 ? (
                <p className="text-sm text-[var(--faint)] text-center py-8">
                  {tr('empty')}
                </p>
              ) : (
                tracks.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl transition ${
                      i === currentIdx ? 'bg-[var(--surface)]' : 'hover:bg-[var(--panel)]'
                    }`}
                  >
                    <button onClick={() => queue.playAt(i)} className="flex-1 min-w-0 text-left">
                      <p className={`truncate text-sm font-medium ${i === currentIdx ? 'text-[var(--accent)]' : ''}`}>
                        {t.title}
                        {t.ai_generated && <span className="ml-2 text-xs text-yellow-500">AI</span>}
                      </p>
                      <p className="truncate text-xs text-[var(--dim)]">{formatTrackArtistLine(t.artists?.name, t.credits, tr('unknownArtist'))}</p>
                    </button>
                    <button onClick={() => queue.addToQueue(t)} title={tr('addQueueTitle')} className="text-xs text-[var(--faint)] hover:text-[var(--text)]">
                      {tr('addQueue')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
