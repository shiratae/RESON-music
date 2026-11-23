'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Player } from '@/components/Player'
import { formatTrackArtistLine, type TrackCredit } from '@/lib/music/credits'

interface TrackDetail {
  id: string
  title: string
  duration_sec: number
  ai_generated: boolean
  cumulative_plays: number
  album_id: string | null
  artists: { id: string; name: string; founding_artist: boolean } | null
  albums: { id: string; title: string; cover_r2_key: string | null; cover_url: string | null } | null
  credits?: TrackCredit[]
}

function TrackDetailContent() {
  const t = useTranslations('TrackDetail')
  const searchParams = useSearchParams()
  const trackId = searchParams.get('id') ?? ''
  const [track, setTrack] = useState<TrackDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!trackId) { setLoading(false); setNotFound(true); return }
    fetch(`/api/tracks/${trackId}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((d) => {
        if (d) setTrack(d.track)
        setLoading(false)
      })
  }, [trackId])

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--faint)]">{t('loading')}</div>
  }
  if (notFound || !track) {
    return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--faint)]">{t('notFound')}</div>
  }

  const coverSrc = track.albums?.cover_r2_key
    ? `/api/albums/${track.albums.id}/cover`
    : track.albums?.cover_url

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
          {t('backHome')}
        </Link>

        <div className="flex gap-4">
          {coverSrc && (
            <img src={coverSrc} alt={track.title} className="h-20 w-20 shrink-0 rounded-lg object-cover border border-[var(--line)]" />
          )}
          <div>
            <h1 className="font-display text-xl font-bold">{track.title}</h1>
            <p className="mt-1 text-sm text-[var(--dim)] flex items-center gap-1">
              {formatTrackArtistLine(track.artists?.name, track.credits, t('unknownArtist'))}
              {track.artists?.founding_artist && (
                <span title={t('foundingArtist')} className="text-[var(--accent)]">★</span>
              )}
            </p>
            {track.albums && (
              <Link href={`/albums?id=${track.albums.id}`} className="mt-1 inline-block text-xs text-[var(--faint)] hover:text-[var(--dim)] underline">
                {t('album', { album: track.albums.title })}
              </Link>
            )}
          </div>
        </div>

        <Player
          track={{
            id: track.id,
            title: track.title,
            duration_sec: track.duration_sec,
            artists: track.artists,
            credits: track.credits,
          }}
        />
      </div>
    </div>
  )
}

export default function TrackDetailPage() {
  return (
    <Suspense>
      <TrackDetailContent />
    </Suspense>
  )
}
