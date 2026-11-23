'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface RankedTrack {
  id: string
  title: string
  cumulative_plays: number
  artists: { id: string; name: string } | null
  this_week_boosts: number
  last_week_boosts: number
  growth_rate: number
}

export default function BoostRankingPage() {
  const t = useTranslations('BoostRanking')
  const [tracks, setTracks] = useState<RankedTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/boost/weekly-ranking')
      .then((r) => r.json())
      .then((d) => { setTracks(d.tracks ?? []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {t('home')}
          </Link>
        </div>
        <p className="text-xs text-[var(--faint)]">
          {t('description')}
        </p>

        {loading ? (
          <p className="text-sm text-[var(--faint)]">{t('loading')}</p>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-[var(--faint)] text-center py-8">{t('empty')}</p>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, i) => (
              <div key={track.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    <span className="text-[var(--faint)] mr-2">#{i + 1}</span>
                    {track.title}
                  </p>
                  <p className="text-xs text-[var(--dim)] ml-6">{track.artists?.name ?? t('unknownArtist')}</p>
                </div>
                <span className="text-xs text-[var(--accent)] shrink-0 ml-2">
                  {t('weekly', { current: track.this_week_boosts, previous: track.last_week_boosts })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
