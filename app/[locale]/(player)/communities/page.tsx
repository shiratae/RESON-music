'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface Community {
  id: string
  name: string
  parent_id: string | null
  member_count: number
  joined: boolean
}

export default function CommunitiesPage() {
  const t = useTranslations('Communities')
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    fetch('/api/communities')
      .then((r) => r.json())
      .then((d) => { setCommunities(d.communities ?? []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function toggleJoin(c: Community) {
    setBusyId(c.id)
    await fetch('/api/communities', {
      method: c.joined ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre_id: c.id }),
    })
    setBusyId(null)
    load()
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
          <div className="py-20 text-center text-[var(--faint)]">{t('loading')}</div>
        ) : (
          <div className="mt-6 space-y-3">
            {communities.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-[var(--faint)]">{t('members', { count: c.member_count })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {c.joined && (
                    <Link
                      href={`/feed?genre_id=${c.id}`}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs hover:border-[var(--accent)]"
                    >
                      {t('feed')}
                    </Link>
                  )}
                  <button
                    onClick={() => toggleJoin(c)}
                    disabled={busyId === c.id}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                      c.joined
                        ? 'border border-[var(--line)] text-[var(--dim)]'
                        : 'bg-[var(--accent)] text-[var(--ink)]'
                    }`}
                  >
                    {c.joined ? t('joined') : t('join')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
