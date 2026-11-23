'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { getPathname, Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordRequestPage() {
  const t = useTranslations('Auth.resetRequest')
  const locale = useLocale()
  const common = useTranslations('Auth.common')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function requestReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${getPathname({ locale, href: '/reset-password/confirm' })}`,
    })
    setLoading(false)
    if (error) { setError(t('failed')); return }
    setSent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-end">
          <LocaleSwitcher
            href="/reset-password"
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">RESON</h1>
          <p className="mt-2 text-sm text-zinc-400">{t('title')}</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-4xl">📩</p>
            <p className="text-sm text-zinc-300">
              {t('sent', { email })}
            </p>
            <Link href="/login" className="block text-sm text-zinc-500 hover:text-zinc-300 transition">
              {t('back')}
            </Link>
          </div>
        ) : (
          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{common('email')}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
              <p className="mt-1 text-xs text-zinc-600">{t('helper')}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 disabled:opacity-50 transition"
            >
              {loading ? t('sending') : t('send')}
            </button>
            <Link href="/login" className="block text-center text-sm text-zinc-500 hover:text-zinc-300 transition">
              {t('back')}
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
