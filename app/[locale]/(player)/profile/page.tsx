'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

const MAX_BEST_TRACKS = 10

interface TrackOption {
  id: string
  title: string
  artists: { id: string; name: string } | null
}

interface BestTrackEntry {
  rank: number
  track_id: string
  tracks: TrackOption | null
}

export default function ProfilePage() {
  const t = useTranslations('Profile')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [personaTags, setPersonaTags] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [bestTracks, setBestTracks] = useState<BestTrackEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TrackOption[]>([])
  const [bestTracksError, setBestTracksError] = useState('')
  const [bestTracksSaved, setBestTracksSaved] = useState(false)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  useEffect(() => {
    loadProfile()
    loadBestTracks()
    fetch('/api/profile/suggested-tags')
      .then((r) => r.json())
      .then((d) => setSuggestedTags(d.suggested_tags ?? []))
  }, [])

  async function loadProfile() {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()
      if (!response.ok) throw new Error(t('loadFailed'))
      if (data.profile) {
        setDisplayName(data.profile.display_name ?? '')
        setBio(data.profile.bio ?? '')
        setPersonaTags((data.profile.persona_tags ?? []).join(', '))
      }
    } catch {
      setLoadError(t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  function addSuggestedTag(tag: string) {
    const current = personaTags.split(',').map((t) => t.trim()).filter(Boolean)
    if (current.includes(tag) || current.length >= 10) return
    setPersonaTags([...current, tag].join(', '))
  }

  function loadBestTracks() {
    fetch('/api/best-tracks')
      .then((r) => r.json())
      .then((d) => setBestTracks(d.best_tracks ?? []))
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

  function addBestTrack(track: TrackOption) {
    if (bestTracks.some((b) => b.track_id === track.id)) return
    if (bestTracks.length >= MAX_BEST_TRACKS) {
      setBestTracksError(t('bestLimit', { count: MAX_BEST_TRACKS }))
      return
    }
    setBestTracksError('')
    setBestTracks((prev) => [...prev, { rank: prev.length + 1, track_id: track.id, tracks: track }])
    setSearchQuery('')
    setSearchResults([])
  }

  function removeBestTrack(trackId: string) {
    setBestTracks((prev) =>
      prev.filter((b) => b.track_id !== trackId).map((b, i) => ({ ...b, rank: i + 1 }))
    )
  }

  function moveBestTrack(index: number, dir: -1 | 1) {
    setBestTracks((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((b, i) => ({ ...b, rank: i + 1 }))
    })
  }

  async function saveBestTracks() {
    setBestTracksError('')
    setBestTracksSaved(false)
    const res = await fetch('/api/best-tracks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_ids: bestTracks.map((b) => b.track_id) }),
    })
    if (!res.ok) { setBestTracksError(t('rankingSaveFailed')); return }
    setBestTracksSaved(true)
    loadBestTracks()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    const tags = personaTags.split(',').map((t) => t.trim()).filter(Boolean)
    if (tags.length > 10) {
      setError(t('tagLimit'))
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, bio, persona_tags: tags }),
    })
    setSaving(false)
    if (!res.ok) { setError(t('saveFailed')); return }
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)] sm:px-8">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <Link href="/home" className="font-display text-xl font-bold">RESON</Link>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {t('backHome')}
          </Link>
        </div>

        <h1 className="font-display mt-8 text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-[var(--faint)]">
          {t('description')}
        </p>

        {loading ? (
          <div role="status" aria-live="polite" className="py-20 text-center text-[var(--faint)]">{t('loading')}</div>
        ) : loadError ? (
          <div className="mt-6 rounded-2xl border border-red-800 bg-red-900/20 p-4">
            <p role="alert" className="text-sm text-red-300">{loadError}</p>
            <button type="button" onClick={loadProfile} className="mt-3 text-sm underline">
              {t('retry')}
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div>
              <label htmlFor="profile-display-name" className="text-xs text-[var(--faint)]">{t('displayName')}</label>
              <input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="profile-bio" className="text-xs text-[var(--faint)]">{t('bio')}</label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="profile-persona-tags" className="text-xs text-[var(--faint)]">{t('personaLabel')}</label>
              <input
                id="profile-persona-tags"
                value={personaTags}
                onChange={(e) => setPersonaTags(e.target.value)}
                placeholder={t('personaPlaceholder')}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
              />
              {suggestedTags.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-[var(--faint)]">{t('suggestions')}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {suggestedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addSuggestedTag(tag)}
                        className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--dim)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
            {saved && <p role="status" className="text-xs text-[var(--accent)]">{t('saved')}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </form>
        )}

        <h2 className="font-display mt-10 text-xl font-bold">{t('rankingTitle')}</h2>
        <p className="mt-2 text-sm text-[var(--faint)]">
          {t('rankingDescription', { count: MAX_BEST_TRACKS })}
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <input
            aria-label={t('searchLabel')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => addBestTrack(track)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface)]"
                >
                  {track.title} <span className="text-[var(--faint)]">{t('separator')} {track.artists?.name}</span>
                </button>
              ))}
            </div>
          )}

          {bestTracksError && <p className="mt-2 text-xs text-red-400">{bestTracksError}</p>}

          {bestTracks.length === 0 ? (
            <p className="mt-4 text-center text-xs text-[var(--faint)]">{t('emptyRanking')}</p>
          ) : (
            <div className="mt-4 space-y-2">
              {bestTracks.map((b, i) => (
                <div key={b.track_id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2">
                  <span className="w-6 shrink-0 text-sm font-bold text-[var(--accent)]">#{b.rank}</span>
                  <div className="flex-1 text-sm">
                    {b.tracks?.title}
                    <span className="ml-1 text-xs text-[var(--faint)]">{t('separator')} {b.tracks?.artists?.name}</span>
                  </div>
                  <button onClick={() => moveBestTrack(i, -1)} disabled={i === 0} className="text-xs text-[var(--dim)] disabled:opacity-30">▲</button>
                  <button onClick={() => moveBestTrack(i, 1)} disabled={i === bestTracks.length - 1} className="text-xs text-[var(--dim)] disabled:opacity-30">▼</button>
                  <button onClick={() => removeBestTrack(b.track_id)} className="text-xs text-red-400">✕</button>
                </div>
              ))}
            </div>
          )}

          {bestTracksSaved && <p className="mt-3 text-xs text-[var(--accent)]">{t('saved')}</p>}
          <button
            onClick={saveBestTracks}
            disabled={bestTracks.length === 0}
            className="mt-4 w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
          >
            {t('saveRanking')}
          </button>
        </div>
      </div>
    </div>
  )
}
