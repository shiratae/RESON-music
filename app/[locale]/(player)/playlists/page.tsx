'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface Playlist {
  id: string
  title: string
  is_public: boolean
  updated_at: string
}

export default function PlaylistsPage() {
  const t = useTranslations('Playlists')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  function load() {
    fetch('/api/playlists?mine=true')
      .then((r) => r.json())
      .then((d) => { setPlaylists(d.playlists ?? []); setLoading(false) })
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setError('')
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setError(t('createFailed')); return }
    setNewTitle('')
    load()
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {t('home')}
          </Link>
        </div>

        <form onSubmit={createPlaylist} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={100}
            placeholder={t('placeholder')}
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
          >
            {creating ? t('creating') : t('create')}
          </button>
        </form>
        {error && <p className="text-xs text-red-400">{error}</p>}

        {loading ? (
          <p className="text-sm text-[var(--faint)]">{t('loading')}</p>
        ) : playlists.length === 0 ? (
          <p className="text-sm text-[var(--faint)]">{t('empty')}</p>
        ) : (
          <div className="space-y-1">
            {playlists.map((p) => (
              <Link
                key={p.id}
                href={`/playlists/detail?id=${p.id}`}
                className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm hover:border-[var(--accent)] transition"
              >
                {p.title}
                {!p.is_public && <span className="ml-2 text-xs text-[var(--faint)]">{t('private')}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
