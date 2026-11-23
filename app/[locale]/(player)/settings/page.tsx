'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Link } from '@/i18n/navigation'
import { SELECT_SETTINGS } from '@/lib/privacy/settings'

interface Settings {
  is_private: boolean
  profile_public: boolean
  feed_enabled: boolean
  follow_enabled: boolean
  matching_enabled: boolean
  comment_enabled: boolean
  community_enabled: boolean
  collection_public: boolean
  follow_request_from: string
  dm_from: string
  comment_notif_from: string
  like_notif: boolean
  matching_suggestion: boolean
  artist_news: string
  support_history_public: boolean
  exclusive_content: boolean
  backer_community: boolean
  score_public: boolean
  listening_data_use: boolean
}

const DEFAULTS: Settings = {
  is_private: false,
  profile_public: false,
  feed_enabled: false,
  follow_enabled: true,
  matching_enabled: true,
  comment_enabled: true,
  community_enabled: true,
  collection_public: true,
  follow_request_from: SELECT_SETTINGS.follow_request_from[0],
  dm_from: SELECT_SETTINGS.dm_from[0],
  comment_notif_from: SELECT_SETTINGS.comment_notif_from[0],
  like_notif: true,
  matching_suggestion: true,
  artist_news: SELECT_SETTINGS.artist_news[0],
  support_history_public: true,
  exclusive_content: true,
  backer_community: true,
  score_public: true,
  listening_data_use: false,
}

function Toggle({ id, label, value, onChange }: { id: string; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTranslations('Settings')
  return (
    <div className="shrink-0 mt-0.5">
      <button
        role="switch"
        aria-checked={value}
        aria-label={t('toggleAria', { label })}
        id={id}
        onClick={() => onChange(!value)}
        className={`relative w-10 h-[22px] rounded-full transition-colors ${value ? 'bg-white' : 'bg-zinc-600'}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-black rounded-full transition-transform ${value ? 'translate-x-[18px]' : ''}`}
        />
      </button>
    </div>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[13px] px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-white cursor-pointer min-w-[130px] shrink-0"
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

export default function SettingsPage() {
  const t = useTranslations('Settings')
  const [s, setS] = useState<Settings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error('settings fetch failed')
        return r.json()
      })
      .then((d) => {
        if (d.settings && Object.keys(d.settings).length > 0) {
          setS({ ...DEFAULTS, ...d.settings })
        }
        setLoaded(true)
      })
      .catch(() => setError(t('fetchFailed')))
  }, [t])

  const update = useCallback(async (patch: Partial<Settings>) => {
    if (saving) return
    let previous: Settings | undefined
    setS((current) => {
      previous = current
      return { ...current, ...patch }
    })
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error('settings update failed')
    } catch {
      if (previous) setS(previous)
      setError(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [saving, t])

  const followOptions = [
    { value: SELECT_SETTINGS.follow_request_from[0], label: t('options.everyone') },
    { value: SELECT_SETTINGS.follow_request_from[1], label: t('options.mutual') },
    { value: SELECT_SETTINGS.follow_request_from[2], label: t('options.nobody') },
  ]
  const dmOptions = [
    { value: SELECT_SETTINGS.dm_from[0], label: t('options.everyone') },
    { value: SELECT_SETTINGS.dm_from[1], label: t('options.followers') },
    { value: SELECT_SETTINGS.dm_from[2], label: t('options.doNotReceive') },
  ]
  const commentOptions = [
    { value: SELECT_SETTINGS.comment_notif_from[0], label: t('options.everyone') },
    { value: SELECT_SETTINGS.comment_notif_from[1], label: t('options.followers') },
    { value: SELECT_SETTINGS.comment_notif_from[2], label: t('options.doNotReceive') },
  ]
  const artistNewsOptions = [
    { value: SELECT_SETTINGS.artist_news[0], label: t('options.all') },
    { value: SELECT_SETTINGS.artist_news[1], label: t('options.important') },
    { value: SELECT_SETTINGS.artist_news[2], label: t('options.doNotReceive') },
  ]

  if (!loaded) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white">
        <div className="mx-auto max-w-[680px]">
          <h1 className="text-[22px] font-medium">{t('title')}</h1>
          <p role={error ? 'alert' : 'status'} className="mt-5 text-sm text-zinc-400">
            {error || t('loading')}
          </p>
          {error && <button onClick={() => window.location.reload()} className="mt-4 text-sm underline">{t('reload')}</button>}
        </div>
      </main>
    )
  }

  return (
    <main aria-busy={saving} className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-[680px] mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[22px] font-medium">{t('title')}</h1>
          {saving && <span className="text-xs text-zinc-500">{t('saving')}</span>}
        </div>
        <p className="text-sm text-zinc-500 mb-8">{t('description')}</p>
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</p>}

        <Section title={t('sections.display')}>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-medium text-zinc-300">{t('display.theme')}</p>
              <p className="text-[13px] text-zinc-500 mt-0.5">{t('display.themeDesc')}</p>
            </div>
            <ThemeToggle />
          </div>
        </Section>

        <Section title={t('sections.account')}>
          <div className={`rounded-xl border px-4 py-3 flex gap-3 mb-4 transition-colors ${
            s.is_private ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-950 border-zinc-800'
          }`}>
            <span className="text-xl mt-0.5 shrink-0">🔒</span>
            <div className="flex-1 min-w-0">
              <p className={`text-[15px] font-medium ${s.is_private ? 'text-white' : 'text-zinc-400'}`}>
                {t('private.label')}
              </p>
              <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{t('private.desc')}</p>
            </div>
            <Toggle id="t-private" label={t('private.label')} value={s.is_private} onChange={(v) => update({ is_private: v })} />
          </div>
        </Section>

        <Section title={t('sections.social')}>
          <Card>
            <Row label={t('social.profile.label')} desc={t('social.profile.desc')}>
              <Toggle id="t-profile" label={t('social.profile.label')} value={s.profile_public} onChange={(v) => update({ profile_public: v })} />
            </Row>
            <Row label={t('social.feed.label')} desc={t('social.feed.desc')}>
              <Toggle id="t-feed" label={t('social.feed.label')} value={s.feed_enabled} onChange={(v) => update({ feed_enabled: v })} />
            </Row>
            <Row label={t('social.follow.label')} desc={t('social.follow.desc')}>
              <Toggle id="t-follow" label={t('social.follow.label')} value={s.follow_enabled} onChange={(v) => update({ follow_enabled: v })} />
            </Row>
            <Row label={t('social.matching.label')} desc={t('social.matching.desc')}>
              <Toggle id="t-match" label={t('social.matching.label')} value={s.matching_enabled} onChange={(v) => update({ matching_enabled: v })} />
            </Row>
            <Row label={t('social.comment.label')} desc={t('social.comment.desc')}>
              <Toggle id="t-comment" label={t('social.comment.label')} value={s.comment_enabled} onChange={(v) => update({ comment_enabled: v })} />
            </Row>
            <Row label={t('social.community.label')} desc={t('social.community.desc')}>
              <Toggle id="t-community" label={t('social.community.label')} value={s.community_enabled} onChange={(v) => update({ community_enabled: v })} />
            </Row>
            <Row label={t('social.collection.label')} desc={t('social.collection.desc')} last>
              <Toggle id="t-collection" label={t('social.collection.label')} value={s.collection_public} onChange={(v) => update({ collection_public: v })} />
            </Row>
          </Card>
        </Section>

        <Section title={t('sections.incoming')}>
          <Card>
            <Row label={t('incoming.follow.label')} desc={t('incoming.follow.desc')} disabled={!s.follow_enabled}>
              <Select
                label={t('incoming.follow.aria')}
                value={s.follow_request_from}
                options={followOptions}
                onChange={(v) => update({ follow_request_from: v })}
              />
            </Row>
            <Row label={t('incoming.dm.label')} desc={t('incoming.dm.desc')}>
              <Select
                label={t('incoming.dm.aria')}
                value={s.dm_from}
                options={dmOptions}
                onChange={(v) => update({ dm_from: v })}
              />
            </Row>
            <Row label={t('incoming.comments.label')} desc={t('incoming.comments.desc')} disabled={!s.comment_enabled}>
              <Select
                label={t('incoming.comments.aria')}
                value={s.comment_notif_from}
                options={commentOptions}
                onChange={(v) => update({ comment_notif_from: v })}
              />
            </Row>
            <Row label={t('incoming.likes.label')}>
              <Select
                label={t('incoming.likes.label')}
                value={s.like_notif ? 'on' : 'off'}
                options={[
                  { value: 'on', label: t('options.on') },
                  { value: 'off', label: t('options.off') },
                ]}
                onChange={(v) => update({ like_notif: v === 'on' })}
              />
            </Row>
            <Row label={t('incoming.matching.label')} desc={t('incoming.matching.desc')}>
              <Select
                label={t('incoming.matching.label')}
                value={s.matching_suggestion ? 'receive' : 'none'}
                options={[
                  { value: 'receive', label: t('options.receive') },
                  { value: 'none', label: t('options.doNotReceive') },
                ]}
                onChange={(v) => update({ matching_suggestion: v === 'receive' })}
              />
            </Row>
            <Row label={t('incoming.artist.label')} desc={t('incoming.artist.desc')} last>
              <Select
                label={t('incoming.artist.label')}
                value={s.artist_news}
                options={artistNewsOptions}
                onChange={(v) => update({ artist_news: v })}
              />
            </Row>
          </Card>
        </Section>

        <Section title={t('sections.support')}>
          <Card>
            <Row label={t('support.history.label')} desc={t('support.history.desc')}>
              <Toggle id="t-support-hist" label={t('support.history.label')} value={s.support_history_public} onChange={(v) => update({ support_history_public: v })} />
            </Row>
            <Row label={t('support.exclusive.label')} desc={t('support.exclusive.desc')}>
              <Toggle id="t-exclusive" label={t('support.exclusive.label')} value={s.exclusive_content} onChange={(v) => update({ exclusive_content: v })} />
            </Row>
            <Row label={t('support.community.label')} desc={t('support.community.desc')} last>
              <Toggle id="t-backer" label={t('support.community.label')} value={s.backer_community} onChange={(v) => update({ backer_community: v })} />
            </Row>
          </Card>
        </Section>

        <Section title={t('sections.data')}>
          <Card>
            <Row label={t('data.score.label')} desc={t('data.score.desc')}>
              <Toggle id="t-score" label={t('data.score.label')} value={s.score_public} onChange={(v) => update({ score_public: v })} />
            </Row>
            <Row label={t('data.listening.label')} desc={t('data.listening.desc')} last>
              <Toggle id="t-listen" label={t('data.listening.label')} value={s.listening_data_use} onChange={(v) => update({ listening_data_use: v })} />
            </Row>
          </Card>
        </Section>

        <Section title={t('sections.privacy')}>
          <Link href="/privacy-requests" className="block rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-white hover:border-zinc-600">
            {t('privacyCta')}
          </Link>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-[13px] font-medium text-zinc-500 uppercase tracking-[0.06em] mb-3 pb-2 border-b border-zinc-800">
        {title}
      </p>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4">
      {children}
    </div>
  )
}

function Row({
  label, desc, children, last = false, disabled = false,
}: {
  label: string
  desc?: string
  children: React.ReactNode
  last?: boolean
  disabled?: boolean
}) {
  return (
    <div className={`flex items-start justify-between py-[14px] gap-4 transition-opacity ${
      !last ? 'border-b border-zinc-800' : ''
    } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="min-w-0">
        <p className="text-[15px] text-white">{label}</p>
        {desc && <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      {children}
    </div>
  )
}
