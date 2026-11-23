'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

type Step = 'account' | 'role' | 'confirm-email' | 'artist' | 'bank' | 'rights' | 'done'
type Role = 'listener' | 'artist'

async function readJson(response: Response): Promise<{ code?: string; needs_email_confirmation?: boolean }> {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('Auth.register')
  const common = useTranslations('Auth.common')
  const [step, setStep] = useState<Step>('account')
  const [role, setRole] = useState<Role | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [bankName, setBankName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [accountType, setAccountType] = useState<'ordinary' | 'checking'>('ordinary')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [isMinor, setIsMinor] = useState(false)
  const [parentConsentName, setParentConsentName] = useState('')
  const [parentConsentContact, setParentConsentContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) sessionStorage.setItem('reson_ref', ref)
  }, [])

  function accountErrorMessage(code?: string) {
    switch (code) {
      case 'invalid_email':
        return t('validation.invalidEmail')
      case 'password_too_short':
        return t('validation.passwordMin')
      default:
        return t('validation.accountFailed')
    }
  }

  function artistErrorMessage(code?: string) {
    switch (code) {
      case 'authentication_required':
        return t('validation.authRequired')
      case 'artist_name_required':
        return t('validation.artistNameRequired')
      case 'artist_name_too_long':
        return t('validation.artistNameTooLong')
      case 'rights_required':
        return t('validation.rightsRequired')
      case 'bank_required':
        return t('validation.bankRequired')
      case 'guardian_required':
        return t('validation.parentRequired')
      case 'artist_already_registered':
        return t('validation.alreadyRegistered')
      default:
        return t('validation.artistFailed')
    }
  }

  async function createAccount(e: React.FormEvent) {
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
    try {
      const ref = sessionStorage.getItem('reson_ref')
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ref }),
      })
      const data = await readJson(res)
      if (!res.ok) {
        setError(accountErrorMessage(data.code))
        return
      }
      sessionStorage.removeItem('reson_ref')
      setNeedsConfirmation(!!data.needs_email_confirmation)
      setStep('role')
    } catch {
      setError(t('validation.network'))
    } finally {
      setLoading(false)
    }
  }

  function chooseRole(chosen: Role) {
    setRole(chosen)
    if (needsConfirmation) {
      setStep('confirm-email')
      return
    }
    if (chosen === 'listener') {
      router.push('/home')
      return
    }
    setStep('artist')
  }

  function nextFromArtist(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('bank')
  }

  function nextFromBank(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('rights')
  }

  async function submitRegistration(e: React.FormEvent) {
    e.preventDefault()
    if (!rightsConfirmed) {
      setError(t('validation.rightsRequired'))
      return
    }
    if (isMinor && (!parentConsentName.trim() || !parentConsentContact.trim())) {
      setError(t('validation.parentRequired'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio,
          rights_confirmed: rightsConfirmed,
          bank: {
            bank_name: bankName,
            branch_name: branchName,
            account_type: accountType,
            account_number: accountNumber,
            account_holder_name: accountHolderName,
          },
          is_minor: isMinor,
          parent_consent_name: isMinor ? parentConsentName : undefined,
          parent_consent_contact: isMinor ? parentConsentContact : undefined,
        }),
      })
      const data = await readJson(res)
      if (!res.ok) {
        setError(artistErrorMessage(data.code))
        return
      }
      setStep('done')
    } catch {
      setError(t('validation.network'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-end">
          <LocaleSwitcher
            href="/register"
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">RESON</h1>
          <p className="mt-2 text-sm text-zinc-400">{t('title')}</p>
        </div>

        {role === 'artist' && step !== 'done' && step !== 'confirm-email' && step !== 'role' && (
          <StepIndicator current={step} />
        )}

        {error && (
          <p role="alert" aria-live="assertive" className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {step === 'account' && (
          <form onSubmit={createAccount} className="space-y-4">
            <div>
              <label htmlFor="register-email" className="block text-sm text-zinc-400 mb-1">{common('email')}</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm text-zinc-400 mb-1">{common('password')}</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
              <p className="mt-1 text-xs text-zinc-600">{common('passwordMin')}</p>
            </div>
            <div>
              <label htmlFor="register-password-confirm" className="block text-sm text-zinc-400 mb-1">{common('passwordConfirm')}</label>
              <input
                id="register-password-confirm"
                type="password"
                autoComplete="new-password"
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
              aria-busy={loading}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 disabled:opacity-50 transition"
            >
              {loading ? t('account.creating') : t('account.create')}
            </button>
            <p className="text-center text-xs leading-5 text-zinc-500">
              {t('account.privacyBefore')}<Link href="/privacy" className="underline hover:text-white">{t('account.privacyLink')}</Link>{t('account.privacyAfter')}
            </p>
            <p className="text-center text-sm text-zinc-500">
              {t('account.existing')}{' '}
              <Link href="/login" className="text-white hover:underline">{t('account.login')}</Link>
            </p>
          </form>
        )}

        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400 text-center">{t('role.question')}</p>
            <button
              type="button"
              onClick={() => chooseRole('listener')}
              className="w-full text-left bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-4 hover:border-zinc-400 transition"
            >
              <span className="block font-semibold">{t('role.listenerTitle')}</span>
              <span className="block text-xs text-zinc-500 mt-1">{t('role.listenerDescription')}</span>
            </button>
            <button
              type="button"
              onClick={() => chooseRole('artist')}
              className="w-full text-left bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-4 hover:border-zinc-400 transition"
            >
              <span className="block font-semibold">{t('role.artistTitle')}</span>
              <span className="block text-xs text-zinc-500 mt-1">{t('role.artistDescription')}</span>
            </button>
          </div>
        )}

        {step === 'confirm-email' && (
          <div className="text-center space-y-4">
            <p className="text-4xl">📩</p>
            <h2 className="text-lg font-bold">{t('confirmEmail.title')}</h2>
            <p className="text-sm text-zinc-400">
              {t('confirmEmail.message', { email })}
              {role === 'artist' && <> {t('confirmEmail.artistContinuation')}</>}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 transition"
            >
              {t('confirmEmail.login')}
            </button>
          </div>
        )}

        {step === 'artist' && (
          <form onSubmit={nextFromArtist} className="space-y-4">
            <div>
              <label htmlFor="artist-name" className="block text-sm text-zinc-400 mb-1">{t('artist.name')} <span className="text-red-400">*</span></label>
              <input
                id="artist-name"
                type="text"
                placeholder={t('artist.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="artist-bio" className="block text-sm text-zinc-400 mb-1">{t('artist.bio')}</label>
              <textarea
                id="artist-bio"
                placeholder={t('artist.bioPlaceholder')}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400 resize-none"
              />
              <p className="mt-1 text-xs text-zinc-600 text-right">{bio.length}/500</p>
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 transition"
            >
              {t('artist.next')}
            </button>
          </form>
        )}

        {step === 'bank' && (
          <form onSubmit={nextFromBank} className="space-y-4">
            <p className="text-xs text-zinc-500">
              {t('bank.description')}
            </p>
            <div>
              <label htmlFor="bank-name" className="block text-sm text-zinc-400 mb-1">{t('bank.bankName')} <span className="text-red-400">*</span></label>
              <input
                id="bank-name"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="branch-name" className="block text-sm text-zinc-400 mb-1">{t('bank.branchName')} <span className="text-red-400">*</span></label>
              <input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="account-type" className="block text-sm text-zinc-400 mb-1">{t('bank.accountType')} <span className="text-red-400">*</span></label>
              <select
                id="account-type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'ordinary' | 'checking')}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              >
                <option value="ordinary">{t('bank.ordinary')}</option>
                <option value="checking">{t('bank.checking')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="account-number" className="block text-sm text-zinc-400 mb-1">{t('bank.accountNumber')} <span className="text-red-400">*</span></label>
              <input
                id="account-number"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="account-holder-name" className="block text-sm text-zinc-400 mb-1">{t('bank.holderName')} <span className="text-red-400">*</span></label>
              <input
                id="account-holder-name"
                type="text"
                placeholder={t('bank.holderPlaceholder')}
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 transition"
            >
              {t('bank.next')}
            </button>
            <button
              type="button"
              onClick={() => setStep('artist')}
              className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              {common('back')}
            </button>
          </form>
        )}

        {step === 'rights' && (
          <form onSubmit={submitRegistration} className="space-y-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300 space-y-2">
              <p>{t('rights.intro')}</p>
              <ul className="list-disc list-inside text-zinc-400 space-y-1">
                <li>{t('rights.item1')}</li>
                <li>{t('rights.item2')}</li>
                <li>{t('rights.item3')}</li>
              </ul>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-white"
              />
              <span className="text-sm">{t('rights.agree')}</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer border-t border-zinc-800 pt-4">
              <input
                type="checkbox"
                checked={isMinor}
                onChange={(e) => setIsMinor(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-white"
              />
              <span className="text-sm">{t('rights.minor')}</span>
            </label>
            {isMinor && (
              <div className="space-y-2 pl-8">
                <input
                  type="text"
                  aria-label={t('rights.parentName')}
                  placeholder={t('rights.parentName')}
                  value={parentConsentName}
                  onChange={(e) => setParentConsentName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                <input
                  type="text"
                  aria-label={t('rights.parentContact')}
                  placeholder={t('rights.parentContactPlaceholder')}
                  value={parentConsentContact}
                  onChange={(e) => setParentConsentContact(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                <p className="text-xs text-zinc-600">
                  {t('rights.parentNotice')}
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !rightsConfirmed}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 disabled:opacity-50 transition"
            >
              {loading ? t('rights.submitting') : t('rights.submit')}
            </button>
            <button
              type="button"
              onClick={() => setStep('bank')}
              className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              {common('back')}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <p className="text-4xl">🛠️</p>
            <h2 className="text-lg font-bold">{t('done.title')}</h2>
            <p className="text-sm text-zinc-400">
              {t('done.description')}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 transition"
            >
              {t('done.dashboard')}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

function StepIndicator({ current }: { current: Exclude<Step, 'done' | 'confirm-email' | 'role'> }) {
  const t = useTranslations('Auth.register')
  const steps: { key: Exclude<Step, 'done' | 'confirm-email' | 'role'>; label: string }[] = [
    { key: 'account', label: t('steps.account') },
    { key: 'artist', label: t('steps.profile') },
    { key: 'bank', label: t('steps.bank') },
    { key: 'rights', label: t('steps.rights') },
  ]
  const idx = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center gap-1.5">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1 ${i <= idx ? 'text-white' : 'text-zinc-600'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < idx ? 'bg-white text-black' : i === idx ? 'border-2 border-white' : 'border border-zinc-700'}`}>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className="text-xs hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-4 h-px ${i < idx ? 'bg-white' : 'bg-zinc-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
