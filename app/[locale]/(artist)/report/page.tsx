'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

interface Distribution {
  year_month: string
  distribution_yen: number
  tips_yen: number
  score_breakdown: {
    play_time_score: number
    support_rate: number
    completion_rate: number
  }
}

interface Track {
  id: string
  title: string
  cumulative_plays: number
  in_distribution: boolean
  ai_generated: boolean
  review_status: 'pending' | 'approved' | 'rejected'
}

interface ReportData {
  artist: { id: string; name: string; review_status: string }
  balance: { balance_yen: number; dormant: boolean }
  distributions: Distribution[]
  tracks: Track[]
}

export default function ArtistReportPage() {
  const t = useTranslations('ArtistReport')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/artist/report')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setSelectedMonth(d.distributions?.[0]?.year_month ?? null)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500">{t('loading')}</p>
      </main>
    )
  }

  if (!data || !data.artist) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">{t('artistRequired')}</p>
          <Link href="/register" className="text-white underline">{t('register')}</Link>
        </div>
      </main>
    )
  }

  const month = data.distributions.find((d) => d.year_month === selectedMonth) ?? data.distributions[0]
  const totalPaid = data.distributions.reduce((sum, d) => sum + d.distribution_yen + (d.tips_yen ?? 0), 0)
  const distributedTracks = data.tracks.filter((track) => track.in_distribution)

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-zinc-400">{data.artist.name}</p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white underline">
            {t('dashboard')}
          </Link>
        </div>

        {data.distributions.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-500">
            {t('empty')}
          </div>
        ) : (
          <>
            {/* 月選択 */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.distributions.map((d) => (
                <button
                  key={d.year_month}
                  onClick={() => setSelectedMonth(d.year_month)}
                  className={`shrink-0 text-sm px-3 py-1.5 rounded-lg border transition ${
                    d.year_month === selectedMonth
                      ? 'border-white bg-white text-black'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {d.year_month}
                </button>
              ))}
            </div>

            {month && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{t('distributionResult', { month: month.year_month })}</h2>
                  <p className="text-2xl font-bold">
                    ¥{Math.floor(month.distribution_yen).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-4">
                  <FormulaRow
                    label={t('playTimeScore')}
                    weight={0.4}
                    value={month.score_breakdown.play_time_score}
                    formula={t('playTimeFormula')}
                    note={t('playTimeNote')}
                  />
                  <FormulaRow
                    label={t('supportRate')}
                    weight={0.35}
                    value={month.score_breakdown.support_rate * 100}
                    isPercent
                    formula={t('supportFormula')}
                    note={t('supportNote')}
                  />
                  <FormulaRow
                    label={t('completionRate')}
                    weight={0.25}
                    value={month.score_breakdown.completion_rate * 100}
                    isPercent
                    formula={t('completionFormula')}
                  />
                </div>

                <div className="border-t border-zinc-800 pt-4 text-sm text-zinc-400 space-y-1">
                  <p>{t('rawFormula')}</p>
                  <p>{t('distributionFormula')}</p>
                  <p className="text-zinc-600">{t('tipsRevenue', { amount: Math.floor(month.tips_yen ?? 0) })}</p>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex justify-between text-sm">
              <span className="text-zinc-400">{t('totalReceived')}</span>
              <span className="font-semibold">¥{Math.floor(totalPaid).toLocaleString()}</span>
            </div>
          </>
        )}

        {/* 楽曲別の分配対象状況 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold">{t('tracksTitle')}</h2>
          <p className="text-xs text-zinc-600">
            {t('tracksDescription')}
          </p>
          {data.tracks.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('noTracks')}</p>
          ) : (
            data.tracks.map((track) => (
              <div key={track.id} className="flex items-center justify-between text-sm border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                <span className="truncate">{track.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {track.review_status === 'pending' && <span className="text-xs text-yellow-500">{t('pending')}</span>}
                  {track.review_status === 'rejected' && <span className="text-xs text-red-400">{t('rejected')}</span>}
                  <span className={track.in_distribution ? 'text-zinc-300' : 'text-zinc-600'}>
                    {track.in_distribution ? t('eligible', { count: track.cumulative_plays }) : t('progress', { count: track.cumulative_plays })}
                  </span>
                </span>
              </div>
            ))
          )}
          <p className="text-xs text-zinc-600 pt-1">{t('eligibleCount', { eligible: distributedTracks.length, total: data.tracks.length })}</p>
        </div>

        <p className="text-center text-xs text-zinc-600">
          <Link href="/pricing" className="hover:text-zinc-400 underline">
            {t('pricingLink')}
          </Link>
        </p>
      </div>
    </main>
  )
}

function FormulaRow({
  label, weight, value, isPercent = false, formula, note,
}: {
  label: string
  weight: number
  value: number
  isPercent?: boolean
  formula: string
  note?: string
}) {
  const display = isPercent ? `${value.toFixed(1)}%` : value.toFixed(4)
  const pct = isPercent ? Math.min(value, 100) : Math.min(value * 100, 100)

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>
          {label}
          <span className="text-zinc-500 ml-1.5 text-xs">× {weight}</span>
        </span>
        <span className="text-zinc-300">{display}</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div className="bg-white h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-zinc-600 mt-0.5">{formula}</p>
      {note && <p className="text-xs text-zinc-700 mt-0.5">{note}</p>}
    </div>
  )
}
