'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('Auth.login')
  const common = useTranslations('Auth.common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) sessionStorage.setItem('reson_ref', ref)
  }, [])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); setError(t('failed')); return }

    // アーティスト登録済みか判定してリダイレクト先を分岐する
    // （同一アカウントがリスナー/アーティストの両方を兼ねられる想定のため、
    // artistsレコードの有無だけを見る。判定に失敗した場合はリスナー扱いで/homeへ）
    const statusRes = await fetch('/api/artist/status')
    setLoading(false)
    const statusData = statusRes.ok ? await statusRes.json() : { has_artist: false }
    router.push(statusData.has_artist ? '/dashboard' : '/home')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-end">
          <LocaleSwitcher
            href="/login"
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

        <form onSubmit={login} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm text-zinc-400 mb-1">{common('email')}</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm text-zinc-400 mb-1">{common('password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 disabled:opacity-50 transition"
          >
            {loading ? t('submitting') : t('submit')}
          </button>
          <Link href="/reset-password" className="block text-center text-sm text-zinc-500 hover:text-zinc-300 transition">
            {t('forgot')}
          </Link>
        </form>

        <p className="text-center text-sm text-zinc-500">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-white hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>
    </main>
  )
}
