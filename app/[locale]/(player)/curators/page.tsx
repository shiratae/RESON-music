'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface CuratorEntry {
  user_id: string
  display_name: string | null
  score: number
}

export default function CuratorsPage() {
  const t = useTranslations('Curators')
  const [leaderboard, setLeaderboard] = useState<CuratorEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/curator/leaderboard')
      .then((r) => r.json())
      .then((d) => { setLeaderboard(d.leaderboard ?? []); setLoading(false) })
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
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-[var(--faint)] text-center py-8">{t('empty')}</p>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((c, i) => (
              <div key={c.user_id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
                <span className="text-sm">
                  <span className="text-[var(--faint)] mr-3">#{i + 1}</span>
                  {c.display_name ?? t('anonymous')}
                </span>
                <span className="text-sm font-bold text-[var(--accent)]">{c.score}pt</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
