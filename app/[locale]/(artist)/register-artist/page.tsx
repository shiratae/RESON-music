'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

type Step = 'artist' | 'bank' | 'rights' | 'done'

// 既存のリスナーアカウントが後からアーティスト登録するためのフロー。
// app/(auth)/register のアーティスト向けステップ（artist/bank/rights）と同じ
// 入力項目・同じAPI（/api/auth/register-artist）を使うが、ログイン済みユーザー
// 向けの単独ページとして提供する（メール+パスワードの作成は不要）。
export default function RegisterArtistPage() {
  const router = useRouter()
  const t = useTranslations('Auth.register')
  const common = useTranslations('Auth.common')
  const [step, setStep] = useState<Step>('artist')
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
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(artistErrorMessage(data.code)); return }
    setStep('done')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">RESON</h1>
          <p className="mt-2 text-sm text-zinc-400">{t('standaloneTitle')}</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {step === 'artist' && (
          <form onSubmit={nextFromArtist} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('artist.name')} <span className="text-red-400">*</span></label>
              <input
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
              <label className="block text-sm text-zinc-400 mb-1">{t('artist.bio')}</label>
              <textarea
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
              <label className="block text-sm text-zinc-400 mb-1">{t('bank.bankName')} <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('bank.branchName')} <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('bank.accountType')} <span className="text-red-400">*</span></label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'ordinary' | 'checking')}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              >
                <option value="ordinary">{t('bank.ordinary')}</option>
                <option value="checking">{t('bank.checking')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('bank.accountNumber')} <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">{t('bank.holderName')} <span className="text-red-400">*</span></label>
              <input
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
                  placeholder={t('rights.parentName')}
                  value={parentConsentName}
                  onChange={(e) => setParentConsentName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
                />
                <input
                  type="text"
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
