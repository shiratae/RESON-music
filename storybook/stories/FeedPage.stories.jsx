import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import FeedPage from '../../app/[locale]/(player)/feed/page'

const post = {
  id: 'post-storybook',
  body: 'Storybookでフィード表示を確認しています。',
  visibility: 'public',
  created_at: '2026-09-21T00:00:00.000Z',
  track_id: 'feed-track',
  author_user_id: 'feed-user',
  author_artist_id: 'feed-artist',
  tracks: { id: 'feed-track', title: 'Attached Storybook Track' },
  artists: { id: 'feed-artist', name: 'Feed Artist', founding_artist: true },
}

const meta = {
  title: 'Pages/Social/Feed',
  component: FeedPage,
  parameters: {
    nextjs: { navigation: { pathname: '/feed' } },
  },
}

export default meta

export const Empty = {
  parameters: {
    mockApi: {
      'GET /api/posts': { body: { posts: [] } },
    },
  },
}

export const WithPostAndComments = {
  parameters: {
    mockApi: {
      'GET /api/posts': { body: { posts: [post] } },
      'GET /api/posts/post-storybook/comments': {
        body: {
          comments: [
            {
              id: 'comment-1',
              body: 'この曲いいですね。',
              user_id: 'commenter-1',
              created_at: '2026-09-21T00:05:00.000Z',
            },
          ],
        },
      },
      'POST /api/likes': { body: { liked: true } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /コメント/ }))
    await expect(await canvas.findByText('この曲いいですね。')).toBeVisible()
    await expect(canvas.getByLabelText('コメント本文')).toBeVisible()
  },
}

export const PostFailure = {
  parameters: {
    mockApi: {
      'GET /api/posts': { body: { posts: [] } },
      'POST /api/posts': {
        status: 500,
        body: { code: 'post_failed' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('投稿内容'), '送信失敗を確認する投稿')
    await userEvent.click(canvas.getByRole('button', { name: '投稿する' }))
    await expect(canvas.getByText('投稿できませんでした。もう一度お試しください。')).toBeVisible()
  },
}

export const MobileWithPost = {
  globals: {
    viewport: { value: 'mobile2', isRotated: false },
  },
  parameters: {
    mockApi: {
      'GET /api/posts': { body: { posts: [post] } },
    },
  },
}
