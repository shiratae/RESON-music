import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import DashboardPage from '../../app/[locale]/(artist)/dashboard/page'

const report = {
  artist: {
    id: 'artist-storybook',
    name: 'Storybook Artist',
    review_status: 'approved',
    founding_artist: true,
  },
  balance: {
    balance_yen: 62000,
    dormant: false,
  },
  distributions: [
    {
      year_month: '2026-09',
      distribution_yen: 12840,
      tips_yen: 3400,
      score_breakdown: {
        play_time_score: 0.84,
        support_rate: 0.31,
        completion_rate: 0.72,
      },
    },
    {
      year_month: '2026-08',
      distribution_yen: 9320,
      tips_yen: 2100,
      score_breakdown: {
        play_time_score: 0.74,
        support_rate: 0.26,
        completion_rate: 0.68,
      },
    },
  ],
  tracks: [
    {
      id: 'dashboard-track-1',
      title: 'Dashboard Track',
      cumulative_plays: 1250,
      in_distribution: true,
      ai_generated: false,
      recording_type: 'original',
      content_category: 'none',
      review_status: 'approved',
      isrc: 'JP-ABC-26-00001',
    },
    {
      id: 'dashboard-track-2',
      title: 'Pending Track',
      cumulative_plays: 42,
      in_distribution: false,
      ai_generated: true,
      recording_type: 'original',
      content_category: 'none',
      review_status: 'pending',
      isrc: null,
    },
  ],
}

const apiMocks = {
  'GET /api/artist/report': { body: report },
  'GET /api/payout/request': {
    body: {
      requests: [
        {
          id: 'payout-1',
          amount_yen: 5000,
          status: 'paid',
          requested_at: '2026-09-15T00:00:00.000Z',
        },
      ],
    },
  },
  'GET /api/albums': {
    body: {
      albums: [
        {
          id: 'album-storybook',
          title: 'Storybook Album',
          released_at: '2026-09-01T00:00:00.000Z',
          release_type: 'album',
          cover_r2_key: null,
        },
      ],
    },
  },
  'GET /api/artist/bank-account': {
    body: {
      bank_account: {
        bank_name: 'テスト銀行',
        branch_name: '音楽支店',
        account_type: 'ordinary',
        account_number: '1234567',
        account_holder_name: 'テスト アーティスト',
      },
    },
  },
  'GET /api/tracks/dashboard-track-1/lyrics': {
    body: { lyrics: 'Storybook lyrics' },
  },
  'PATCH /api/artist/bank-account': {
    body: { ok: true },
  },
  'PATCH /api/tracks/dashboard-track-1': {
    body: { ok: true },
  },
  'POST /api/payout/request': {
    body: {
      request: {
        id: 'payout-new',
        amount_yen: 62000,
        status: 'pending',
        requested_at: '2026-09-21T00:00:00.000Z',
      },
    },
  },
}

const meta = {
  title: 'Pages/Artist/Dashboard',
  component: DashboardPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/dashboard',
      },
    },
    mockApi: apiMocks,
  },
}

export default meta

export const Default = {}

export const BankAccountEditor = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: '編集する' }))
    await expect(canvas.getByPlaceholderText('銀行名')).toBeVisible()
    await expect(canvas.getByDisplayValue('テスト銀行')).toBeVisible()
  },
}

export const IsrcEditor = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const buttons = await canvas.findAllByRole('button', { name: 'ISRC' })
    await userEvent.click(buttons[0])
    await expect(canvas.getByDisplayValue('JP-ABC-26-00001')).toBeVisible()
  },
}

export const LyricsEditor = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const buttons = await canvas.findAllByRole('button', { name: '歌詞' })
    await userEvent.click(buttons[0])
    await expect(await canvas.findByDisplayValue('Storybook lyrics')).toBeVisible()
  },
}
