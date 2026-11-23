'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface ExploreTrack {
  id: string
  title: string
  duration_sec: number
  cumulative_plays: number
  artist: { id: string; name: string } | null
  genres: string[]
}

const tileColors = ['#1a2e1a', '#1a1a2e', '#2e1a1a', '#2e2a1a', '#1a2e2e', '#2a1a2e']

export default function ExplorePage() {
  const tr = useTranslations('Explore')
  const [tracks, setTracks] = useState<ExploreTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/explore')
      .then((r) => r.json())
      .then((d) => {
        setTracks(d.tracks ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/home" className="font-display text-xl font-bold">
            RESON
          </Link>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {tr('backHome')}
          </Link>
        </div>

        <h1 className="font-display mt-8 text-2xl font-bold">{tr('title')}</h1>
        <p className="mt-2 text-sm text-[var(--faint)]">{tr('description')}</p>

        {loading ? (
          <div className="py-20 text-center text-[var(--faint)]">{tr('loading')}</div>
        ) : tracks.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--panel)] py-20 text-center text-[var(--faint)]">
            <p>{tr('emptyTitle')}</p>
            <p className="mt-1 text-xs">{tr('emptyDescription')}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t, i) => (
              <div
                key={t.id}
                className="relative aspect-video overflow-hidden rounded-xl border border-[var(--line)]"
                style={{ backgroundColor: tileColors[i % tileColors.length] }}
              >
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="text-xs text-[var(--dim)]">{t.artist?.name ?? tr('unknownArtist')}</p>
                  {t.genres.length > 0 && (
                    <p className="mt-1 text-[10px] text-[var(--faint)]">{t.genres.join(' / ')}</p>
                  )}
                  <p className="mt-1 text-[10px] text-[var(--faint)]">{tr('plays', { count: t.cumulative_plays })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
