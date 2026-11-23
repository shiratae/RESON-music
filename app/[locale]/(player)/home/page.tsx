'use client'

import { useEffect, useState } from 'react'
import { Player } from '@/components/Player'
import { usePlayerQueue } from '@/lib/player/queue'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { formatTrackArtistLine, type TrackCredit } from '@/lib/music/credits'

interface Track {
  id: string
  title: string
  duration_sec: number
  ai_generated: boolean
  cumulative_plays: number
  artists: { id: string; name: string } | null
  credits?: TrackCredit[]
}

interface HeatTrack extends Track {
  completion_rate: number
  support_rate: number
  heat_score: number
}

interface ForYouTrack extends HeatTrack {
  because_you_like: boolean
}

const artists = [
  { name: 'ミナミ', genre: 'Lo-fi / Bedroom Pop', color: '#c8f23d', founding: true },
  { name: 'Kento Rui', genre: 'Alternative Rock', color: '#3dc8f2', founding: false },
  { name: '海音', genre: 'Ambient / Folk', color: '#f23d8c', founding: false },
  { name: 'ヨル猫', genre: 'City Pop', color: '#f2c83d', founding: true },
]

const exploreTileColors = ['#1a2e1a', '#1a1a2e', '#2e1a1a']

interface ExploreTrack {
  id: string
  title: string
  cumulative_plays: number
  artist: { id: string; name: string } | null
  genres: string[]
}

export default function PlayerPage() {
  const tr = useTranslations('Home')
  const navItems = [
    { href: '/home', label: tr('nav.home'), icon: '⌂' },
    { href: '/search', label: tr('nav.search'), icon: '⌕' },
    { href: '/explore', label: tr('nav.explore'), icon: '◎' },
    { href: '/feed', label: tr('nav.feed'), icon: '✎' },
    { href: '/library', label: tr('nav.library'), icon: '♥' },
    { href: '/playlists', label: tr('nav.playlists'), icon: '☰' },
    { href: '/notifications', label: tr('nav.notifications'), icon: '🔔' },
    { href: '/wrapped', label: tr('nav.wrapped'), icon: '🎁' },
    { href: '/curators', label: tr('nav.curators'), icon: '🔎' },
    { href: '/boost-ranking', label: tr('nav.boostRanking'), icon: '🚀' },
    { href: '/messages', label: tr('nav.messages'), icon: '✉' },
  ]
  const [tracks, setTracks] = useState<Track[]>([])
  const [heatTracks, setHeatTracks] = useState<HeatTrack[]>([])
  const [forYouTracks, setForYouTracks] = useState<ForYouTrack[]>([])
  const [exploreTracks, setExploreTracks] = useState<ExploreTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [hasArtist, setHasArtist] = useState(true)
  const queue = usePlayerQueue(tracks)

  useEffect(() => {
    fetch('/api/tracks/list')
      .then((r) => r.json())
      .then((d) => {
        setTracks(d.tracks ?? [])
        setLoading(false)
      })
    fetch('/api/recommendations/heat')
      .then((r) => r.json())
      .then((d) => setHeatTracks(d.tracks ?? []))
    fetch('/api/recommendations/foryou')
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((d) => setForYouTracks(d.tracks ?? []))
    fetch('/api/explore')
      .then((r) => r.json())
      .then((d) => setExploreTracks((d.tracks ?? []).slice(0, 3)))
    // アーティスト未登録の場合のみ「アーティストとして登録する」導線を表示する
    fetch('/api/artist/status')
      .then((r) => (r.ok ? r.json() : { has_artist: true }))
      .then((d) => setHasArtist(!!d.has_artist))
  }, [])

  const current = queue.current
  const currentIdx = queue.baseIndex
  const nextIdx = queue.shuffleOn ? undefined : currentIdx + 1
  const nextTrackId = queue.queue[0]?.id ?? (nextIdx !== undefined ? tracks[nextIdx]?.id : undefined)

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* サイドバー */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)] p-6 sm:flex">
        <Link href="/" className="font-display text-xl font-bold">
          RESON
        </Link>
        <nav aria-label={tr('mainNavigation')} className="mt-8 flex flex-col gap-1">
          {navItems.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--dim)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            >
              <span>{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/upload"
          className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm hover:border-[var(--accent)]"
        >
          <p className="font-medium">{tr('buildLibraryTitle')}</p>
          <p className="mt-1 text-xs text-[var(--dim)]">{tr('buildLibraryDescription')}</p>
        </Link>
        <Link
          href="/invite"
          className="mt-3 text-xs text-[var(--faint)] hover:text-[var(--dim)]"
        >
          {tr('inviteFriends')}
        </Link>
        <Link
          href="/communities"
          className="mt-3 text-xs text-[var(--faint)] hover:text-[var(--dim)]"
        >
          {tr('communities')}
        </Link>
        <Link
          href="/events"
          className="mt-1 text-xs text-[var(--faint)] hover:text-[var(--dim)]"
        >
          {tr('events')}
        </Link>
        <Link
          href="/profile"
          className="mt-1 text-xs text-[var(--faint)] hover:text-[var(--dim)]"
        >
          {tr('profile')}
        </Link>
        <Link
          href="/dashboard"
          className="mt-auto text-xs text-[var(--faint)] hover:text-[var(--dim)]"
        >
          {tr('forArtists')}
        </Link>
      </aside>

      {/* メイン */}
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-10">
          {/* トップバー */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-4">
            <input
              disabled
              aria-label={tr('searchPlaceholder')}
              placeholder={tr('searchPlaceholder')}
              className="w-full min-w-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--faint)] sm:w-auto sm:flex-1"
            />
            <Link href="/pricing" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
              {tr('pricing')}
            </Link>
            {hasArtist ? (
              <Link href="/upload" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
                {tr('upload')}
              </Link>
            ) : (
              <Link href="/register-artist" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
                {tr('registerArtist')}
              </Link>
            )}
            <ThemeToggle />
          </div>

          {/* プレイヤー / ピックアップ */}
          {loading ? (
            <div className="py-20 text-center text-[var(--faint)]">{tr('loading')}</div>
          ) : current ? (
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
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] py-20 text-center text-[var(--faint)]">
              <p>{tr('noTracks')}</p>
              <Link href="/upload" className="mt-4 inline-block text-[var(--accent)] underline">
                {tr('uploadFirst')}
              </Link>
            </div>
          )}

          {/* あなたへのおすすめ */}
          {forYouTracks.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold">{tr('forYou.title')}</h2>
              <p className="mt-1 text-xs text-[var(--faint)]">
                {tr('forYou.description')}
              </p>
              <div className="scroll-x mt-4 gap-4 pb-2">
                {forYouTracks.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const idx = tracks.findIndex((tr) => tr.id === t.id)
                      if (idx >= 0) queue.playAt(idx)
                    }}
                    className="flex w-40 shrink-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]"
                  >
                    <span
                      className="block aspect-square w-full rounded-lg"
                      style={{ backgroundColor: ['#3dc8f2', '#f23d8c', '#c8f23d', '#f2c83d'][i % 4] }}
                    />
                    <p className="mt-3 truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-[var(--dim)]">{t.artists?.name ?? tr('unknownArtist')}</p>
                    <p className="mt-1 text-xs text-[var(--faint)]">
                      {t.because_you_like ? (
                        <span className="text-[var(--accent)]">{tr('forYou.frequentArtist')}</span>
                      ) : (
                        tr('forYou.completion', { value: Math.round(t.completion_rate * 100) })
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 熱量が高まっている楽曲 */}
          {heatTracks.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold">{tr('heat.title')}</h2>
              <p className="mt-1 text-xs text-[var(--faint)]">
                {tr('heat.description')}
              </p>
              <div className="scroll-x mt-4 gap-4 pb-2">
                {heatTracks.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const idx = tracks.findIndex((tr) => tr.id === t.id)
                      if (idx >= 0) queue.playAt(idx)
                    }}
                    className="flex w-40 shrink-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]"
                  >
                    <span
                      className="block aspect-square w-full rounded-lg"
                      style={{ backgroundColor: ['#c8f23d', '#3dc8f2', '#f23d8c', '#f2c83d'][i % 4] }}
                    />
                    <p className="mt-3 truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-[var(--dim)]">{t.artists?.name ?? tr('unknownArtist')}</p>
                    <p className="mt-1 text-xs text-[var(--faint)]">
                      {tr('heat.stats', {
                        completion: Math.round(t.completion_rate * 100),
                        support: Math.round(t.support_rate * 100),
                      })}
                      {t.ai_generated && <span className="ml-2 text-yellow-500">AI</span>}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 注目のアーティスト */}
          <section>
            <h2 className="font-display text-lg font-bold">{tr('featuredArtists')}</h2>
            <div className="scroll-x mt-4 gap-6 pb-2">
              {artists.map((a) => (
                <div key={a.name} className="flex w-24 shrink-0 flex-col items-center text-center">
                  <span
                    className="relative flex h-16 w-16 items-center justify-center rounded-full text-xs font-bold text-[var(--ink)]"
                    style={{ backgroundColor: a.color }}
                  >
                    {a.founding && (
                      <span className="absolute -right-1 -top-1 text-[var(--accent)]">★</span>
                    )}
                  </span>
                  <p className="mt-2 truncate text-xs font-medium">{a.name}</p>
                  <p className="truncate text-[10px] text-[var(--faint)]">{a.genre}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 探索モード */}
          {exploreTracks.length > 0 && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{tr('explore.title')}</h2>
                <Link href="/explore" className="text-xs text-[var(--dim)] hover:text-[var(--text)]">
                  {tr('explore.viewAll')}
                </Link>
              </div>
              <p className="mt-1 text-xs text-[var(--faint)]">
                {tr('explore.description')}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {exploreTracks.map((t, i) => (
                  <div
                    key={t.id}
                    className="relative aspect-video overflow-hidden rounded-xl border border-[var(--line)]"
                    style={{ backgroundColor: exploreTileColors[i % exploreTileColors.length] }}
                  >
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-sm font-bold">{t.title}</p>
                      <p className="text-xs text-[var(--dim)]">{t.artist?.name ?? tr('unknownArtist')}</p>
                      {t.genres.length > 0 && (
                        <p className="mt-1 text-[10px] text-[var(--faint)]">{t.genres.join(' / ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* トラックリスト */}
          {tracks.length > 0 && (
            <section className="space-y-1">
              <h2 className="font-display mb-2 text-lg font-bold">{tr('allTracks')}</h2>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 w-full text-left px-4 py-3 rounded-xl transition ${
                    i === currentIdx ? 'bg-[var(--surface)]' : 'hover:bg-[var(--panel)]'
                  }`}
                >
                  <button onClick={() => queue.playAt(i)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium ${i === currentIdx ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                          {t.title}
                        </p>
                        <p className="truncate text-xs text-[var(--dim)]">
                          {formatTrackArtistLine(t.artists?.name, t.credits, tr('unknownArtist'))}
                          {t.ai_generated && <span className="ml-2 text-yellow-500">AI</span>}
                        </p>
                      </div>
                      <div className="ml-3 shrink-0 text-xs text-[var(--faint)]">
                        {Math.floor(t.duration_sec / 60)}:{String(t.duration_sec % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => queue.addToQueue(t)}
                    title={tr('addNextTitle')}
                    className="shrink-0 text-xs text-[var(--faint)] hover:text-[var(--text)] px-2"
                  >
                    {tr('addQueue')}
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>

      {/* モバイルボトムナビ */}
      <nav aria-label={tr('mobileNavigation')} className="fixed inset-x-0 bottom-0 z-50 flex max-w-full overflow-x-auto overscroll-x-contain border-t border-[var(--line)] bg-[var(--panel)] sm:hidden">
        {navItems.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex min-w-16 flex-none flex-col items-center gap-1 px-2 py-3 text-xs text-[var(--dim)]"
          >
            <span>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
