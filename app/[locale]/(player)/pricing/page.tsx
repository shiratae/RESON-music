'use client'

import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/navigation'
import { useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 0,
    features: ['monthly15', 'ads', 'standardQuality'] as const,
    highlight: false,
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    price: 750,
    features: ['unlimited', 'noAds', 'standardQuality', 'supportButton'] as const,
    highlight: false,
  },
  {
    id: 'student' as const,
    name: 'Student',
    price: 250,
    features: ['unlimited', 'noAds', 'standardQuality', 'schoolEmail'] as const,
    highlight: false,
  },
  {
    id: 'support_plus' as const,
    name: 'Support+',
    price: 1000,
    features: ['unlimited', 'noAds', 'highQuality', 'supportBonus', 'tipFee'] as const,
    highlight: true,
  },
]

function PricingContent() {
  const t = useTranslations('Pricing')
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const [loading, setLoading] = useState<string | null>(null)
  const [studentStep, setStudentStep] = useState<'closed' | 'email' | 'code'>('closed')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [studentError, setStudentError] = useState('')
  const [studentBusy, setStudentBusy] = useState(false)

  async function subscribe(planId: string) {
    if (planId === 'free') return
    if (planId === 'student') {
      setStudentError('')
      setStudentStep('email')
      return
    }
    setLoading(planId)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) {
      alert(t('requestFailed'))
      return
    }
    router.push(data.url)
  }

  async function sendStudentCode() {
    setStudentBusy(true)
    setStudentError('')
    const res = await fetch('/api/student/verify/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_email: schoolEmail }),
    })
    setStudentBusy(false)
    if (!res.ok) { setStudentError(t('student.requestFailed')); return }
    setStudentStep('code')
  }

  async function confirmStudentCode() {
    setStudentBusy(true)
    setStudentError('')
    const res = await fetch('/api/student/verify/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: verifyCode }),
    })
    if (!res.ok) {
      setStudentBusy(false)
      setStudentError(t('student.confirmFailed'))
      return
    }
    setStudentStep('closed')
    await subscribeStudent()
  }

  async function subscribeStudent() {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'student' }),
    })
    const data = await res.json()
    setStudentBusy(false)
    if (!res.ok) { alert(t('requestFailed')); return }
    router.push(data.url)
  }

  async function openPortal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { alert(t('requestFailed')); return }
    router.push(data.url)
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-zinc-400 mt-2">{t('subtitle')}</p>
        </div>

        {success && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl px-5 py-4 text-green-300 text-sm text-center">
            {t('success')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col gap-4 ${
                plan.highlight
                  ? 'border-white bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-950'
              }`}
            >
              {plan.highlight && (
                <span className="text-xs bg-white text-black font-bold px-2 py-0.5 rounded-full self-start">
                  {t('recommended')}
                </span>
              )}
              <div>
                <p className="text-lg font-bold">{plan.name}</p>
                <p className="text-3xl font-bold mt-1">
                  {plan.price === 0 ? t('free') : t('price', { amount: plan.price.toLocaleString() })}
                  {plan.price > 0 && <span className="text-sm font-normal text-zinc-400">{t('perMonth')}</span>}
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-zinc-500 mt-0.5">✓</span>
                    {t(`features.${feature}`)}
                  </li>
                ))}
              </ul>
              {plan.id !== 'free' && (
                <button
                  onClick={() => subscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                    plan.highlight
                      ? 'bg-white text-black hover:bg-zinc-200'
                      : 'border border-zinc-600 text-white hover:bg-zinc-800'
                  }`}
                >
                  {loading === plan.id ? t('processing') : t('subscribe', { plan: plan.name })}
                </button>
              )}
            </div>
          ))}
        </div>

        {studentStep !== 'closed' && (
          <div className="border border-zinc-700 rounded-2xl p-6 max-w-sm mx-auto space-y-3">
            <p className="font-semibold text-sm">{t('student.title')}</p>
            <p className="text-xs text-zinc-500">{t('student.description')}</p>
            {studentStep === 'email' && (
              <>
                <input
                  type="email"
                  aria-label={t('student.emailLabel')}
                  placeholder="example@school.ed.jp"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                />
                <button
                  onClick={sendStudentCode}
                  disabled={studentBusy || !schoolEmail}
                  className="w-full rounded-lg py-2 text-sm font-semibold bg-white text-black disabled:opacity-50"
                >
                  {studentBusy ? t('student.sending') : t('student.sendCode')}
                </button>
              </>
            )}
            {studentStep === 'code' && (
              <>
                <input
                  type="text"
                  aria-label={t('student.codeLabel')}
                  placeholder={t('student.codePlaceholder')}
                  value={verifyCode}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                />
                <button
                  onClick={confirmStudentCode}
                  disabled={studentBusy || verifyCode.length !== 6}
                  className="w-full rounded-lg py-2 text-sm font-semibold bg-white text-black disabled:opacity-50"
                >
                  {studentBusy ? t('student.checking') : t('student.confirm')}
                </button>
              </>
            )}
            {studentError && <p role="alert" aria-live="assertive" className="text-xs text-red-400">{studentError}</p>}
            <button onClick={() => setStudentStep('closed')} className="text-xs text-zinc-500 underline">
              {t('student.cancel')}
            </button>
          </div>
        )}

        <div className="text-center space-x-4">
          <button
            onClick={openPortal}
            className="text-sm text-zinc-500 hover:text-zinc-300 underline transition"
          >
            {t('manage')}
          </button>
          <Link href="/parental" className="text-sm text-zinc-500 hover:text-zinc-300 underline transition">
            {t('parental')}
          </Link>
        </div>

        {/* 分配の透明性（仕様書: 計算式はパブリックに公開） */}
        <div className="border border-zinc-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-bold">{t('transparency.title')}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t.rich('transparency.paragraph1', {
              bold: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t.rich('transparency.paragraph2', {
              bold: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
          </p>
          <table className="w-full text-sm text-zinc-400 border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 font-normal">{t('transparency.plan')}</th>
                <th className="text-right py-2 font-normal">{t('transparency.weight')}</th>
                <th className="text-right py-2 font-normal">{t('transparency.pool')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Support+', weight: '1.3', pool: t('transparency.supportPool') },
                { name: 'Standard', weight: '1.0', pool: t('transparency.standardPool') },
                { name: 'Student', weight: '0.7', pool: t('transparency.studentPool') },
                { name: 'Free', weight: '0.4', pool: t('transparency.freePool') },
              ].map((r) => (
                <tr key={r.name} className="border-b border-zinc-900">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right">{r.weight}</td>
                  <td className="py-2 text-right">{r.pool}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}
