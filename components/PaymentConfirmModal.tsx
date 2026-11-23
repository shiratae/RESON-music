'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { getStripeClient } from '@/lib/stripe-client'

interface PaymentConfirmModalProps {
  clientSecret: string
  title: string
  onSuccess: () => void
  onClose: () => void
}

export function PaymentConfirmModal({ clientSecret, title, onSuccess, onClose }: PaymentConfirmModalProps) {
  const t = useTranslations('Payment')
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
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
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-confirm-title"
        className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
      >
        <div className="flex items-center justify-between">
          <h3 id="payment-confirm-title" className="text-sm font-semibold">{title}</h3>
          <button autoFocus onClick={onClose} aria-label={t('closeDialog')} className="text-zinc-500 hover:text-white">✕</button>
        </div>
        <Elements stripe={getStripeClient()} options={{ clientSecret }}>
          <ConfirmForm onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  )
}

function ConfirmForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const t = useTranslations('Payment')
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    setSubmitting(false)
    if (confirmError) {
      setError(t('failed'))
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <form onSubmit={confirm} className="mt-4 space-y-3">
      <PaymentElement />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
      >
        {submitting ? t('processing') : t('pay')}
      </button>
    </form>
  )
}
