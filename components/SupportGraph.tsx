'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface Supporter {
  user_id: string
  display_name: string | null
}

export function SupportGraph({ trackId }: { trackId: string }) {
  const t = useTranslations('Player.supportGraph')
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    fetch(`/api/tracks/${trackId}/support-graph`)
      .then((r) => (r.ok ? r.json() : { supporters: [], total_support_count: 0 }))
      .then((d) => {
        setSupporters(d.supporters ?? [])
        setTotalCount(d.total_support_count ?? 0)
        setLoaded(true)
      })
  }, [trackId])

  if (!loaded || (supporters.length === 0 && totalCount === 0)) return null

  return (
    <div className="text-center text-xs text-zinc-500">
      {supporters.length > 0 ? (
        <p>
          {t('following', {
            names: supporters
              .slice(0, 3)
              .map((supporter) => supporter.display_name ?? t('anonymous'))
              .join(t('separator')),
            extra: supporters.length > 3 ? t('extra', { count: supporters.length - 3 }) : '',
          })}
        </p>
      ) : (
        <p>{t('total', { count: totalCount })}</p>
      )}
    </div>
  )
}
