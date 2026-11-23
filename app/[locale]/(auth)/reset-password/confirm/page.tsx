'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

export default function ResetPasswordConfirmPage() {
  const router = useRouter()
  const t = useTranslations('Auth.resetConfirm')
  const common = useTranslations('Auth.common')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // メール内のリンクからの遷移時、SupabaseクライアントがURL中の recovery トークンを
    // 検出してセッションを確立するまで待つ（PASSWORD_RECOVERYイベント）
    const supabase = createClient()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError(t('validation.passwordMin'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('validation.passwordMismatch'))
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(t('failed')); return }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">RESON</h1>
          <p className="mt-2 text-sm text-zinc-400">{t('title')}</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {!ready ? (
          <p className="text-sm text-zinc-500 text-center">
            {t('checking')}
          </p>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('newPassword')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
              <p className="mt-1 text-xs text-zinc-600">{common('passwordMin')}</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('newPasswordConfirm')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 disabled:opacity-50 transition"
            >
              {loading ? t('updating') : t('update')}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
