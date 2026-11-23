import React from 'react'
import ArtistReportPage from '../../app/[locale]/(artist)/report/page'

const meta = {
  title: 'Pages/Artist/Report',
  component: ArtistReportPage,
  parameters: { nextjs: { navigation: { pathname: '/report' } } },
}

export default meta

export const NoDistribution = {
  parameters: {
    mockApi: {
      'GET /api/artist/report': {
        body: {
          artist: { id: 'artist-report', name: 'Report Artist', review_status: 'approved' },
          balance: { balance_yen: 0, dormant: false },
          distributions: [],
          tracks: [],
        },
      },
    },
  },
}

export const MonthlyReport = {
  parameters: {
    mockApi: {
      'GET /api/artist/report': {
        body: {
          artist: { id: 'artist-report', name: 'Report Artist', review_status: 'approved' },
          balance: { balance_yen: 14500, dormant: false },
          distributions: [
            { year_month: '2026-09', distribution_yen: 9800, tips_yen: 2400, score_breakdown: { play_time_score: 0.82, support_rate: 0.24, completion_rate: 0.71 } },
            { year_month: '2026-08', distribution_yen: 7600, tips_yen: 1800, score_breakdown: { play_time_score: 0.72, support_rate: 0.20, completion_rate: 0.66 } },
          ],
          tracks: [
            { id: 'rt-1', title: 'Distributed Track', cumulative_plays: 1400, in_distribution: true, ai_generated: false, review_status: 'approved' },
            { id: 'rt-2', title: 'New Track', cumulative_plays: 72, in_distribution: false, ai_generated: false, review_status: 'pending' },
          ],
        },
      },
    },
  },
}
