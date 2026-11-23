'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { formatTrackArtistLine, type TrackCredit } from '@/lib/music/credits'
import { type ContentCategory, type RecordingType } from '@/lib/music/metadata'

interface SearchTrack {
  id: string
  title: string
  duration_sec: number
  recording_type?: RecordingType
  content_category?: ContentCategory
  source_title?: string | null
  source_work_title?: string | null
  artists: { id: string; name: string } | null
  credits?: TrackCredit[]
}

export default function SearchPage() {
  const t = useTranslations('Search')
  const metadataT = useTranslations('MusicMetadata')
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SearchTrack[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setTracks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/tracks/list?q=${encodeURIComponent(trimmed)}`)
        .then((r) => (r.ok ? r.json() : { tracks: [] }))
        .then((d) => { setTracks(d.tracks ?? []); setLoading(false) })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t('catalogTitle')}</h1>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">{t('catalogBack')}</Link>
        </div>
        <div>
          <label htmlFor="track-search" className="sr-only">{t('catalogLabel')}</label>
          <input
            id="track-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalogPlaceholder')}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
          />
          <p className="mt-2 text-xs text-[var(--faint)]">{t('catalogHint')}</p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--faint)]">{t('catalogLoading')}</p>
        ) : query.trim() && tracks.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--faint)]">{t('catalogEmpty')}</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {tracks.map((track) => (
              <Link key={track.id} href={`/track?id=${track.id}`} className="block py-4 first:pt-0 hover:bg-[var(--surface)]/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="mt-1 truncate text-xs text-[var(--dim)]">{formatTrackArtistLine(track.artists?.name, track.credits, t('unknownArtist'))}</p>
                    {(track.source_title || track.source_work_title) && (
                      <p className="mt-1 truncate text-xs text-[var(--faint)]">{track.source_title ?? track.source_work_title}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1 text-[10px]">
                    {track.recording_type && track.recording_type !== 'original' && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--accent)]">{metadataT(`recordingTypes.${track.recording_type}`)}</span>}
                    {track.content_category && track.content_category !== 'none' && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--dim)]">{metadataT(`contentCategories.${track.content_category}`)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--dim)]">{t('catalogPrompt')}</p>
            <Link href="/explore" className="mt-3 inline-block text-xs text-[var(--accent)] underline">{t('tryExplore')}</Link>
          </div>
        )}
        <div className="pt-2">
          <Link href="/home" className="text-sm text-[var(--accent)] underline">{t('backHome')}</Link>
        </div>
      </div>
    </div>
  )
}
