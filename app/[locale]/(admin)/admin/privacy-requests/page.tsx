'use client'

import { Link } from '@/i18n/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

type Request = {
  id: string
  user_id: string
  request_type: string
  details: string
  status: string
  response: string | null
  created_at: string
  responded_at: string | null
}

export default function AdminPrivacyRequestsPage() {
  const t = useTranslations('PrivacyRequests')
  const format = useFormatter()
  const typeLabels: Record<string, string> = {
    access: t('types.access'),
    portability: t('types.portability'),
    erasure: t('types.erasure'),
    rectification: t('types.rectification'),
    restriction: t('types.restriction'),
    objection: t('types.objection'),
  }
  const statusLabels: Record<string, string> = {
    received: t('status.received'),
    in_progress: t('status.inProgress'),
    completed: t('status.completed'),
    declined: t('status.declined'),
  }
  const [requests, setRequests] = useState<Request[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    fetch('/api/admin/privacy-requests', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(t('admin.fetchFailed'))
        setRequests(data.requests ?? [])
      })
      .catch(() => setError(t('admin.fetchFailed')))
  }, [])

  async function update(request: Request, status: string) {
    if ((status === 'completed' || status === 'declined') && !drafts[request.id]?.trim()) {
      setError(t('admin.responseRequired'))
      return
    }
    setBusyId(request.id)
    setError('')
    try {
      const response = await fetch('/api/admin/privacy-requests', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status, response: drafts[request.id] ?? '' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(t('admin.updateFailed'))
      setRequests((current) => current.map((item) => item.id === request.id
        ? { ...item, ...data.request } : item))
    } catch {
      setError(t('admin.updateFailed'))
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">{t('admin.backDashboard')}</Link>
        <h1 className="mt-6 text-2xl font-semibold">{t('admin.title')}</h1>
        <p className="mt-3 text-sm text-zinc-400">{t('admin.description')}</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
        <div className="mt-6 space-y-4">
          {requests.length === 0 && <p className="text-sm text-zinc-500">{t('admin.empty')}</p>}
          {requests.map((request) => {
            const closed = request.status === 'completed' || request.status === 'declined'
            const deadline = new Date(request.created_at)
            deadline.setMonth(deadline.getMonth() + 1)
            return (
              <article key={request.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong>{typeLabels[request.request_type] ?? request.request_type}</strong>
                  <span>{statusLabels[request.status] ?? request.status}</span>
                </div>
                <p className="mt-2 break-all text-xs text-zinc-500">{t('admin.user', { id: request.user_id })}</p>
                <p className="mt-1 text-xs text-zinc-500">{t('admin.receivedTarget', { received: format.dateTime(new Date(request.created_at), { year: 'numeric', month: 'short', day: 'numeric' }), target: format.dateTime(deadline, { year: 'numeric', month: 'short', day: 'numeric' }) })}</p>
                {request.details && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{request.details}</p>}
                {closed ? (
                  <p className="mt-3 whitespace-pre-wrap border-t border-zinc-800 pt-3 text-sm">{t('admin.response', { response: request.response ?? '' })}</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <label htmlFor={`response-${request.id}`} className="block text-sm">{t('admin.responseLabel')}</label>
                    <textarea id={`response-${request.id}`} rows={4} maxLength={4000}
                      value={drafts[request.id] ?? request.response ?? ''}
                      onChange={(event) => setDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm" />
                    <div className="flex flex-wrap gap-2">
                      {request.status === 'received' && <button disabled={busyId === request.id} onClick={() => update(request, 'in_progress')}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs">{t('admin.markInProgress')}</button>}
                      <button disabled={busyId === request.id} onClick={() => update(request, 'completed')}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black">{t('admin.complete')}</button>
                      <button disabled={busyId === request.id} onClick={() => update(request, 'declined')}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs">{t('admin.decline')}</button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
