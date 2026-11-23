import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import ProfilePage from '../../app/[locale]/(player)/profile/page'

const profile = {
  display_name: 'Storybook Listener',
  bio: 'インディー音楽を探すのが好きです。',
  persona_tags: ['夜更かし', 'ギターロック'],
}

const bestTracks = [
  {
    rank: 1,
    track_id: 'best-track-1',
    tracks: {
      id: 'best-track-1',
      title: 'Best Storybook Track',
      artists: { id: 'best-artist-1', name: 'Best Artist' },
    },
  },
]

const profileMocks = {
  'GET /api/profile': { body: { profile } },
  'GET /api/profile/suggested-tags': {
    body: { suggested_tags: ['シティポップ', 'ライブ好き'] },
  },
  'GET /api/best-tracks': {
    body: { best_tracks: bestTracks },
  },
  'PATCH /api/profile': { body: { ok: true } },
  'PUT /api/best-tracks': { body: { ok: true } },
}

const meta = {
  title: 'Pages/Account/Profile',
  component: ProfilePage,
  parameters: {
    nextjs: { navigation: { pathname: '/profile' } },
    mockApi: profileMocks,
  },
}

export default meta

export const Populated = {}

export const LoadingState = {
  parameters: {
    mockApi: {
      ...profileMocks,
      'GET /api/profile': async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        return { body: { profile } }
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent('読み込み中')
    await expect(await canvas.findByLabelText('表示名')).toBeVisible()
  },
}

export const LoadFailureThenRetry = {
  parameters: {
    mockApi: {
      ...profileMocks,
      'GET /api/profile': (() => {
        let attempts = 0
        return async () => {
          attempts += 1
          if (attempts === 1) {
            return { status: 500, body: { error: 'プロフィールを取得できませんでした' } }
          }
          return { body: { profile } }
        }
      })(),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('プロフィールを取得できませんでした')
    await userEvent.click(canvas.getByRole('button', { name: '再試行' }))
    await expect(await canvas.findByLabelText('表示名')).toHaveValue('Storybook Listener')
  },
}

export const SaveSuccess = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const displayName = await canvas.findByLabelText('表示名')
    await userEvent.clear(displayName)
    await userEvent.type(displayName, 'Updated Listener')
    await userEvent.click(canvas.getByRole('button', { name: '保存する' }))
    await expect(canvas.getByRole('status')).toHaveTextContent('保存しました')
  },
}

export const SaveFailure = {
  parameters: {
    mockApi: {
      ...profileMocks,
      'PATCH /api/profile': {
        status: 500,
        body: { error: 'プロフィールを保存できませんでした' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: '保存する' }))
    await expect(canvas.getByRole('alert')).toHaveTextContent('プロフィールを保存できませんでした')
  },
}

export const FieldLengthBoundaries = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const displayName = await canvas.findByLabelText('表示名')
    const bio = canvas.getByLabelText('自己紹介')

    await userEvent.clear(displayName)
    await userEvent.type(displayName, 'A'.repeat(55))
    await expect(displayName).toHaveValue('A'.repeat(50))

    await userEvent.clear(bio)
    await userEvent.type(bio, 'B'.repeat(290))
    await expect(bio).toHaveValue('B'.repeat(280))
  },
}

export const TooManyPersonaTags = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tags = await canvas.findByLabelText('音楽人格タグ（カンマ区切り・最大10個）')
    await userEvent.clear(tags)
    await userEvent.type(tags, 'a,b,c,d,e,f,g,h,i,j,k')
    await userEvent.click(canvas.getByRole('button', { name: '保存する' }))
    await expect(canvas.getByRole('alert')).toHaveTextContent('音楽人格タグは10個までです')
  },
}

export const MobileNoHorizontalOverflow = {
  globals: {
    viewport: { value: 'mobile2', isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByLabelText('表示名')).toBeVisible()
    const doc = canvasElement.ownerDocument
    await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
  },
}
