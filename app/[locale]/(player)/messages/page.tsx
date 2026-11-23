'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface Conversation {
  user_id: string
  display_name: string | null
  last_body: string
  last_at: string
  unread: boolean
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  track_id: string | null
  created_at: string
  tracks: { id: string; title: string; artists: { id: string; name: string } | null } | null
}

interface UserResult {
  user_id: string
  display_name: string | null
}

interface TrackOption {
  id: string
  title: string
  artists: { id: string; name: string } | null
}

function MessagesContent() {
  const t = useTranslations('Messages')
  const searchParams = useSearchParams()
  const router = useRouter()
  const withUserId = searchParams.get('with')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResults, setTrackResults] = useState<TrackOption[]>([])
  const [attachedTrack, setAttachedTrack] = useState<TrackOption | null>(null)
  const [showTrackPicker, setShowTrackPicker] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (!withUserId) return
    loadThread(withUserId)
  }, [withUserId])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.users ?? []))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!trackQuery.trim()) { setTrackResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/tracks/list?q=${encodeURIComponent(trackQuery)}`)
        .then((r) => r.json())
        .then((d) => setTrackResults(d.tracks ?? []))
    }, 300)
    return () => clearTimeout(timer)
  }, [trackQuery])

  function loadConversations() {
    fetch('/api/messages/conversations')
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
  }

  function loadThread(partnerId: string) {
    fetch(`/api/messages?with=${partnerId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? [])
        if (d.messages?.length > 0) {
          const first = d.messages[0]
          setMeId(first.sender_id === partnerId ? first.recipient_id : first.sender_id)
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
  }

  async function send() {
    if (!withUserId || (!draft.trim() && !attachedTrack)) return
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: withUserId, body: draft, track_id: attachedTrack?.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setMeId(data.message.sender_id)
      setDraft('')
      setAttachedTrack(null)
      setShowTrackPicker(false)
      loadThread(withUserId)
      loadConversations()
    }
  }

  function openConversation(id: string) {
    router.push(`/messages?with=${id}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
          <Link href="/home" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
            {t('home')}
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
          {/* 会話一覧 */}
          <div className="space-y-3">
            <input
              aria-label={t('userSearchLabel')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('userSearchPlaceholder')}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
            />
            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => { setSearchQuery(''); setSearchResults([]); openConversation(u.user_id) }}
                    className="block w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface)]"
                  >
                    {u.display_name ?? t('anonymousUser')}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1">
              {conversations.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => openConversation(c.user_id)}
                  className={`block w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                    withUserId === c.user_id ? 'bg-[var(--surface)]' : 'hover:bg-[var(--panel)]'
                  }`}
                >
                  <p className={c.unread ? 'font-semibold' : ''}>{c.display_name ?? t('anonymousUser')}</p>
                  <p className="truncate text-xs text-[var(--faint)]">{c.last_body}</p>
                </button>
              ))}
            </div>
          </div>

          {/* スレッド */}
          <div>
            {!withUserId ? (
              <p className="text-sm text-[var(--faint)] text-center py-12">{t('selectConversation')}</p>
            ) : (
              <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm space-y-1 ${
                        m.sender_id === meId
                          ? 'ml-auto bg-[var(--accent)] text-[var(--ink)]'
                          : 'bg-[var(--panel)] border border-[var(--line)]'
                      }`}
                    >
                      {m.body && <p>{m.body}</p>}
                      {m.tracks && (
                        <Link
                          href={`/track?id=${m.tracks.id}`}
                          className={`block rounded-lg px-2 py-1.5 text-xs underline ${
                            m.sender_id === meId ? 'bg-black/10' : 'bg-[var(--surface)]'
                          }`}
                        >
                          ♪ {m.tracks.title} {t('separator')} {m.tracks.artists?.name}
                        </Link>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                {attachedTrack && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs">
                    <span>♪ {attachedTrack.title} {t('separator')} {attachedTrack.artists?.name}</span>
                    <button onClick={() => setAttachedTrack(null)} aria-label={t('removeAttachment')} className="text-[var(--faint)] hover:text-[var(--text)]">✕</button>
                  </div>
                )}
                {showTrackPicker && !attachedTrack && (
                  <div className="mt-2">
                    <input
                      aria-label={t('trackSearchLabel')}
                      value={trackQuery}
                      onChange={(e) => setTrackQuery(e.target.value)}
                      placeholder={t('trackSearchPlaceholder')}
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs placeholder-[var(--faint)] focus:outline-none"
                    />
                    {trackResults.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {trackResults.map((track) => (
                          <button
                            key={track.id}
                            onClick={() => { setAttachedTrack(track); setTrackQuery(''); setTrackResults([]); setShowTrackPicker(false) }}
                            className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--panel)]"
                          >
                            {track.title} <span className="text-[var(--faint)]">{t('separator')} {track.artists?.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setShowTrackPicker((v) => !v)}
                    title={t('attachTrackTitle')}
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
                  >
                    ♪
                  </button>
                  <input
                    aria-label={t('bodyLabel')}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                    maxLength={1000}
                    placeholder={t('bodyPlaceholder')}
                    className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm placeholder-[var(--faint)] focus:outline-none"
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim() && !attachedTrack}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
                  >
                    {t('send')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  )
}
