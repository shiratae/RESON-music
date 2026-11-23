'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface WrappedData {
  year: number
  total_played_sec: number
  total_plays: number
  completed_plays: number
  distinct_tracks: number
  top_tracks: { track_id: string; title: string; artist_name: string; played_sec: number; play_count: number }[]
  top_artists: { artist_id: string; name: string; played_sec: number }[]
}

export default function WrappedPage() {
  const t = useTranslations('Wrapped')
  const formatHours = (sec: number) => t('duration', { hours: Math.floor(sec / 3600), minutes: Math.floor((sec % 3600) / 60) })
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<WrappedData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/wrapped?year=${year}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [year])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] to-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t('title', { year })}</h1>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {t('home')}
          </Link>
        </div>

        <div className="flex gap-2">
          {[currentYear, currentYear - 1].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                y === year ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--dim)]'
              }`}
            >
              {t('year', { year: y })}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--faint)]">{t('loading')}</p>
        ) : !data || data.total_plays === 0 ? (
          <p className="text-sm text-[var(--faint)] text-center py-12">
            {t('empty', { year })}
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-center">
              <p className="text-4xl font-bold text-[var(--accent)]">{formatHours(data.total_played_sec)}</p>
              <p className="mt-1 text-xs text-[var(--faint)]">{t('totalTime')}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{data.total_plays}</p>
                  <p className="text-xs text-[var(--faint)]">{t('plays')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{data.distinct_tracks}</p>
                  <p className="text-xs text-[var(--faint)]">{t('tracks')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{data.completed_plays}</p>
                  <p className="text-xs text-[var(--faint)]">{t('completed')}</p>
                </div>
              </div>
            </div>

            {data.top_artists.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-bold mb-3">{t('topArtists')}</h2>
                <div className="space-y-2">
                  {data.top_artists.map((a, i) => (
                    <div key={a.artist_id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5">
                      <span className="text-sm">
                        <span className="text-[var(--faint)] mr-2">#{i + 1}</span>
                        {a.name}
                      </span>
                      <span className="text-xs text-[var(--faint)]">{formatHours(a.played_sec)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.top_tracks.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-bold mb-3">{t('topTracks')}</h2>
                <div className="space-y-2">
                  {data.top_tracks.map((track, i) => (
                    <div key={track.track_id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm truncate">
                          <span className="text-[var(--faint)] mr-2">#{i + 1}</span>
                          {track.title}
                        </p>
                        <p className="text-xs text-[var(--dim)] ml-6">{track.artist_name}</p>
                      </div>
                      <span className="text-xs text-[var(--faint)] shrink-0 ml-2">{t('playCount', { count: track.play_count })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
