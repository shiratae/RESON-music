import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import SettingsPage from '../../app/[locale]/(player)/settings/page'

const settings = {
  is_private: false,
  profile_public: true,
  feed_enabled: true,
  follow_enabled: true,
  matching_enabled: true,
  comment_enabled: true,
  community_enabled: true,
  collection_public: true,
  follow_request_from: '全員',
  dm_from: 'フォロワーのみ',
  comment_notif_from: '全員',
  like_notif: true,
  matching_suggestion: true,
  artist_news: '重要のみ',
  support_history_public: true,
  exclusive_content: true,
  backer_community: true,
  score_public: true,
  listening_data_use: false,
}

const meta = {
  title: 'Pages/Account/Settings',
  component: SettingsPage,
  parameters: {
    nextjs: { navigation: { pathname: '/settings' } },
    mockApi: {
      'GET /api/settings': { body: { settings } },
      'PATCH /api/settings': { body: { ok: true } },
    },
  },
}

export default meta

export const Default = {}

export const KeyboardToggle = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const profileToggle = await canvas.findByRole('switch', { name: 'プロフィールページを切り替える' })
    await expect(profileToggle).toHaveAttribute('aria-checked', 'true')
    profileToggle.focus()
    await userEvent.keyboard(' ')
    await expect(profileToggle).toHaveAttribute('aria-checked', 'false')
  },
}

export const SaveFailureRollsBack = {
  parameters: {
    mockApi: {
      'GET /api/settings': { body: { settings } },
      'PATCH /api/settings': { status: 500, body: { error: 'save failed' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const profileToggle = await canvas.findByRole('switch', { name: 'プロフィールページを切り替える' })
    await expect(profileToggle).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(profileToggle)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('保存に失敗しました')
    await expect(profileToggle).toHaveAttribute('aria-checked', 'true')
  },
}

export const LoadFailure = {
  parameters: {
    mockApi: {
      'GET /api/settings': { status: 500, body: { error: 'load failed' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('設定を取得できませんでした')
  },
}

export const Mobile = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}
