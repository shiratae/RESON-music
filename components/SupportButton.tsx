'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PaymentConfirmModal } from './PaymentConfirmModal'

const TIP_PRESETS = [100, 300, 500, 1000]

export function SupportButton({ trackId }: { trackId: string }) {
  const t = useTranslations('Player.support')
  const [hearted, setHearted] = useState(false)
  const [showTipForm, setShowTipForm] = useState(false)
  const [tipAmount, setTipAmount] = useState(TIP_PRESETS[0])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [tipSent, setTipSent] = useState(false)
  const tipTriggerRef = useRef<HTMLButtonElement>(null)
  const tipDialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTipForm) return

    function closeTipDialog() {
      setShowTipForm(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeTipDialog()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = tipDialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      tipTriggerRef.current?.focus()
    }
  }, [showTipForm])

  async function sendHeart() {
    setError('')
    const res = await fetch('/api/supports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId }),
    })
    if (!res.ok) {
      setError(t('failed'))
      return
    }
    setHearted(true)
    setTimeout(() => setHearted(false), 1500)
  }

  async function startTip() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/supports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId, amount_yen: tipAmount }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(t('failed')); return }

    if (data.type === 'tip_deferred') {
      // Support+ は月末蓄積精算のため即時決済不要
      setTipSent(true)
      setShowTipForm(false)
      setTimeout(() => setTipSent(false), 2000)
      return
    }
    setShowTipForm(false)
    setClientSecret(data.client_secret)
  }

  function onTipSuccess() {
    setTipSent(true)
    setShowTipForm(false)
    setTimeout(() => setTipSent(false), 2000)
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={sendHeart}
        title={t('supportTitle')}
        className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-xs hover:border-zinc-400"
      >
        ❤️ {hearted ? t('supported') : t('support')}
      </button>
      <button
        ref={tipTriggerRef}
        onClick={() => setShowTipForm((v) => !v)}
        title={t('tipTitle')}
        className="flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-xs hover:border-zinc-400"
      >
        💴 {tipSent ? t('sent') : t('tip')}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}

      {showTipForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowTipForm(false)
          }}
        >
          <div
            ref={tipDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-tip-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id="support-tip-title" className="text-sm font-semibold">{t('dialogTitle')}</h3>
              <button
                autoFocus
                onClick={() => setShowTipForm(false)}
                aria-label={t('closeDialog')}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(amt)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    tipAmount === amt ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  ¥{amt}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={startTip}
              disabled={loading}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
            >
              {loading ? t('preparing') : t('sendAmount', { amount: tipAmount })}
            </button>
          </div>
        </div>
      )}

      {clientSecret && (
        <PaymentConfirmModal
          clientSecret={clientSecret}
          title={t('paymentTitle', { amount: tipAmount })}
          onSuccess={onTipSuccess}
          onClose={() => setClientSecret(null)}
        />
      )}
    </div>
  )
}
