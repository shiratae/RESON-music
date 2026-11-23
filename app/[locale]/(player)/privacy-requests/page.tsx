'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'

const TYPE_IDS = ['access', 'portability', 'erasure', 'rectification', 'restriction', 'objection'] as const

type PrivacyRequest = {
  id: string
  request_type: string
  details: string
  status: string
  response: string | null
  created_at: string
  responded_at: string | null
}

export default function PrivacyRequestsPage() {
  const t = useTranslations('PrivacyRequests')
  const format = useFormatter()
  const types = TYPE_IDS.map((id) => ({ id, label: t(`types.${id}`) }))
  const statusLabels: Record<string, string> = {
    received: t('status.received'),
    in_progress: t('status.inProgress'),
    completed: t('status.completed'),
    declined: t('status.declined'),
  }
  const [requests, setRequests] = useState<PrivacyRequest[]>([])
  const [type, setType] = useState<string>('access')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/privacy/requests', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(t('user.fetchFailed'))
        setRequests(data.requests ?? [])
      })
      .catch(() => setError(t('user.fetchFailed')))
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/privacy/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_type: type, details }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(t('user.sendFailed'))
      setRequests((current) => [data.request, ...current])
      setDetails('')
      setMessage(t('user.accepted'))
    } catch {
      setError(t('user.sendFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-[680px]">
        <Link href="/settings" className="text-sm text-zinc-400 hover:text-white">{t('user.backSettings')}</Link>
        <h1 className="mt-6 text-2xl font-semibold">{t('user.title')}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {t('user.description')}
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4 border-t border-zinc-800 pt-6">
          <label className="block text-sm" htmlFor="privacy-request-type">{t('user.type')}</label>
          <select id="privacy-request-type" value={type} onChange={(event) => setType(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white">
            {types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <label className="block text-sm" htmlFor="privacy-request-details">{t('user.details')}</label>
          <textarea id="privacy-request-details" value={details} maxLength={2000}
            aria-describedby="privacy-request-details-help privacy-request-details-count"
            onChange={(event) => setDetails(event.target.value)} rows={5}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white" />
          <div className="flex items-start justify-between gap-3 text-xs text-zinc-500">
            <p id="privacy-request-details-help">{t('user.detailsHelp')}</p>
            <p id="privacy-request-details-count" aria-live="polite" className="shrink-0">{details.length}/2000</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {message && <p role="status" className="text-sm text-green-400">{message}</p>}
          <button type="submit" disabled={busy}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
            {busy ? t('user.sending') : t('user.send')}
          </button>
        </form>
        <section className="mt-10 border-t border-zinc-800 pt-6" aria-label={t('user.historyAria')}>
          <h2 className="text-lg font-medium">{t('user.historyTitle')}</h2>
          {requests.length === 0 && <p className="mt-4 text-sm text-zinc-500">{t('user.empty')}</p>}
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <article key={request.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong>{types.find((item) => item.id === request.request_type)?.label ?? request.request_type}</strong>
                  <span>{statusLabels[request.status] ?? request.status}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{t('user.receivedAt', { date: format.dateTime(new Date(request.created_at), { year: 'numeric', month: 'short', day: 'numeric' }) })}</p>
                {request.details && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">{request.details}</p>}
                {request.response && <p className="mt-3 whitespace-pre-wrap border-t border-zinc-800 pt-3 text-sm">{request.response}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
