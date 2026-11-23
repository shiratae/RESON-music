'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PaymentConfirmModal } from './PaymentConfirmModal'

interface BoostStatus {
  used: number
  remaining: number
  free_remaining: number
  price_yen: number
}

export function BoostButton({ trackId }: { trackId: string }) {
  const t = useTranslations('Player.boost')
  const [status, setStatus] = useState<BoostStatus | null>(null)
  const [boosting, setBoosting] = useState(false)
  const [error, setError] = useState('')
  const [justBoosted, setJustBoosted] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/boost')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
  }, [])

  async function boost() {
    setError('')
    setBoosting(true)
    const res = await fetch('/api/boost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId }),
    })
    const data = await res.json()
    setBoosting(false)
    if (!res.ok) { setError(t('failed')); return }

    if (data.type === 'free') {
      setJustBoosted(true)
      setStatus((s) => s ? { ...s, used: s.used + 1, remaining: data.remaining, free_remaining: Math.max(s.free_remaining - 1, 0) } : s)
      setTimeout(() => setJustBoosted(false), 1500)
    } else if (data.type === 'deferred_to_invoice') {
      // サブスク契約者は都度課金せず、次回請求に合算（決済確認モーダルは不要）
      setJustBoosted(true)
      setStatus((s) => s ? { ...s, used: s.used + 1, remaining: data.remaining } : s)
      setTimeout(() => setJustBoosted(false), 1500)
    } else {
      setClientSecret(data.client_secret)
    }
  }

  function onPaidSuccess() {
    setJustBoosted(true)
    setStatus((s) => s ? { ...s, used: s.used + 1, remaining: Math.max(s.remaining - 1, 0) } : s)
    setTimeout(() => setJustBoosted(false), 1500)
  }

  if (!status) return null

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={boost}
        disabled={boosting || status.remaining <= 0}
        title={t('title')}
        className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-xs hover:border-zinc-400 disabled:opacity-40"
      >
        🚀 {justBoosted ? t('boosted') : t('boost')}
      </button>
      <span className="text-xs text-zinc-500">
        {t('remaining', { remaining: status.remaining, freeRemaining: status.free_remaining })}
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}

      {clientSecret && (
        <PaymentConfirmModal
          clientSecret={clientSecret}
          title={t('paymentTitle', { amount: status.price_yen })}
          onSuccess={onPaidSuccess}
          onClose={() => setClientSecret(null)}
        />
      )}
    </div>
  )
}
