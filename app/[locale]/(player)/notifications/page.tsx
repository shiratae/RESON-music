'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'

interface Notification {
  id: string
  type: string
  actor_user_id: string | null
  target_type: string | null
  target_id: string | null
  read_at: string | null
  created_at: string
}

export default function NotificationsPage() {
  const t = useTranslations('Notifications')
  const format = useFormatter()
  const typeLabels: Record<string, string> = {
    follow: t('types.follow'),
    like: t('types.like'),
    comment: t('types.comment'),
    mention: t('types.mention'),
    support: t('types.support'),
    new_track: t('types.newTrack'),
    balance_threshold: t('types.balanceThreshold'),
    message: t('types.message'),
    monthly_report: t('types.monthlyReport'),
  }
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications ?? [])
        setLoading(false)
        fetch('/api/notifications', { method: 'PATCH' })
      })
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

        {loading ? (
          <p className="text-sm text-[var(--faint)]">{t('loading')}</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-[var(--faint)] text-center py-8">{t('empty')}</p>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 rounded-xl text-sm ${n.read_at ? 'text-[var(--dim)]' : 'text-[var(--text)] bg-[var(--surface)]'}`}
              >
                <p>{typeLabels[n.type] ?? n.type}</p>
                <p className="mt-1 text-xs text-[var(--faint)]">
                  {format.dateTime(new Date(n.created_at), { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
