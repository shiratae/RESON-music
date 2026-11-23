'use client'

import { useEffect, useState, Suspense } from 'react'
import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

interface Post {
  id: string
  body: string
  visibility: string
  created_at: string
  track_id: string | null
  author_user_id: string
  author_artist_id: string | null
  tracks: { id: string; title: string } | null
  artists: { id: string; name: string; founding_artist: boolean } | null
}

interface TrackOption {
  id: string
  title: string
  artists: { id: string; name: string } | null
}

interface Comment {
  id: string
  body: string
  user_id: string
  created_at: string
}

export default function FeedPage() {
  return (
    <Suspense>
      <FeedPageInner />
    </Suspense>
  )
}

function FeedPageInner() {
  const tr = useTranslations('Feed')
  const format = useFormatter()
  const searchParams = useSearchParams()
  const genreId = searchParams.get('genre_id')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResults, setTrackResults] = useState<TrackOption[]>([])
  const [attachedTrack, setAttachedTrack] = useState<TrackOption | null>(null)

  function loadFeed() {
    const url = genreId ? `/api/posts?genre_id=${genreId}` : '/api/posts'
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts ?? []); setLoading(false) })
  }

  useEffect(() => { loadFeed() }, [genreId])

  useEffect(() => {
    if (!trackQuery.trim()) { setTrackResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/tracks/list?q=${encodeURIComponent(trackQuery)}`)
        .then((r) => r.json())
        .then((d) => setTrackResults(d.tracks ?? []))
    }, 300)
    return () => clearTimeout(timer)
  }, [trackQuery])

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setError('')
    setPosting(true)
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, genre_id: genreId || undefined, track_id: attachedTrack?.id }),
    })
    const data = await res.json()
    setPosting(false)
    if (!res.ok) { setError(tr('postFailed')); return }
    setBody('')
    setAttachedTrack(null)
    setTrackQuery('')
    loadFeed()
  }

  async function toggleLike(postId: string) {
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'post', target_id: postId }),
    })
    if (!res.ok) return
    const data = await res.json()
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (data.liked) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  async function openPostComments(postId: string) {
    if (openComments === postId) {
      setOpenComments(null)
      return
    }
    setOpenComments(postId)
    const res = await fetch(`/api/posts/${postId}/comments`)
    const data = await res.json()
    setComments(data.comments ?? [])
  }

  async function submitComment(postId: string) {
    if (!commentBody.trim()) return
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody }),
    })
    if (!res.ok) return
    setCommentBody('')
    const res2 = await fetch(`/api/posts/${postId}/comments`)
    const data = await res2.json()
    setComments(data.comments ?? [])
  }

  async function reportPost(postId: string) {
    const reason = window.prompt(tr('reportPrompt'))
    if (!reason || !reason.trim()) return
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'post', target_id: postId, reason }),
    })
    setOpenMenu(null)
    if (res.ok) window.alert(tr('reported'))
  }

  async function blockUser(authorUserId: string) {
    if (!window.confirm(tr('blockConfirm'))) return
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked_id: authorUserId }),
    })
    setOpenMenu(null)
    if (res.ok) {
      setHiddenPostIds((prev) => new Set([...prev, ...posts.filter((p) => p.author_user_id === authorUserId).map((p) => p.id)]))
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)] sm:px-8">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <Link href="/home" className="font-display text-xl font-bold">RESON</Link>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {tr('backHome')}
          </Link>
        </div>

        <h1 className="font-display mt-8 text-2xl font-bold">{tr('title')}</h1>
        <p className="mt-2 text-sm text-[var(--faint)]">{tr('description')}</p>

        <form onSubmit={submitPost} className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <textarea
            aria-label={tr('postContentLabel')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={tr('postPlaceholder')}
            className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
          />
          {attachedTrack ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs">
              <span>♪ {attachedTrack.title} · {attachedTrack.artists?.name ?? tr('unknownArtist')}</span>
              <button type="button" onClick={() => setAttachedTrack(null)} aria-label={tr('removeAttachedTrack')} className="text-[var(--faint)] hover:text-[var(--text)]">✕</button>
            </div>
          ) : (
            <div className="mt-2">
              <input
                aria-label={tr('attachSearchLabel')}
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder={tr('attachSearchPlaceholder')}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs placeholder-[var(--faint)] focus:outline-none"
              />
              {trackResults.length > 0 && (
                <div className="mt-1 space-y-1">
                  {trackResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setAttachedTrack(t); setTrackQuery(''); setTrackResults([]) }}
                      className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--surface)]"
                    >
                      {t.title} <span className="text-[var(--faint)]">· {t.artists?.name ?? tr('unknownArtist')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={posting || !body.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
            >
              {posting ? tr('posting') : tr('post')}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="py-20 text-center text-[var(--faint)]">{tr('loading')}</div>
        ) : posts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--panel)] py-16 text-center text-[var(--faint)]">
            <p>{tr('empty')}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {posts.filter((p) => !hiddenPostIds.has(p.id)).map((p) => (
              <div key={p.id} className="relative rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs text-[var(--faint)]">
                    {p.artists?.name ?? tr('listener')}
                    {p.artists?.founding_artist && <span className="ml-1 text-[var(--accent)]">★</span>}
                    {' '}· {format.dateTime(new Date(p.created_at), { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <button
                    onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                    aria-label={tr('postMenu')}
                    className="text-[var(--faint)] hover:text-[var(--text)]"
                  >
                    ⋯
                  </button>
                </div>
                {openMenu === p.id && (
                  <div className="absolute right-4 top-8 z-10 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs shadow-lg">
                    <button onClick={() => reportPost(p.id)} className="block w-full px-4 py-2 text-left hover:bg-[var(--panel)]">
                      {tr('report')}
                    </button>
                    <button onClick={() => blockUser(p.author_user_id)} className="block w-full px-4 py-2 text-left text-red-400 hover:bg-[var(--panel)]">
                      {tr('block')}
                    </button>
                  </div>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
                {p.tracks && (
                  <Link href={`/track?id=${p.tracks.id}`} className="mt-2 inline-block rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--accent)] hover:border-[var(--accent)]">
                    ♪ {p.tracks.title}
                  </Link>
                )}
                <div className="mt-3 flex gap-4 text-xs text-[var(--dim)]">
                  <button onClick={() => toggleLike(p.id)} className="hover:text-[var(--text)]">
                    {likedIds.has(p.id) ? tr('liked') : tr('like')}
                  </button>
                  <button onClick={() => openPostComments(p.id)} className="hover:text-[var(--text)]">
                    {tr('comments')}
                  </button>
                </div>

                {openComments === p.id && (
                  <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                    {comments.map((c) => (
                      <p key={c.id} className="text-xs text-[var(--dim)]">{c.body}</p>
                    ))}
                    <div className="flex gap-2">
                      <input
                        aria-label={tr('commentLabel')}
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        maxLength={500}
                        placeholder={tr('commentPlaceholder')}
                        className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs placeholder-[var(--faint)] focus:outline-none"
                      />
                      <button
                        onClick={() => submitComment(p.id)}
                        className="shrink-0 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs hover:border-[var(--accent)]"
                      >
                        {tr('send')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
