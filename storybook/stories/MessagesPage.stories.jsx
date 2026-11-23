import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import MessagesPage from '../../app/[locale]/(player)/messages/page'

const conversations = [
  {
    user_id: 'partner-1',
    display_name: 'Storybook Listener',
    last_body: 'この曲どう？',
    last_at: '2026-09-21T00:00:00.000Z',
    unread: true,
  },
]

const thread = [
  {
    id: 'msg-1',
    sender_id: 'partner-1',
    recipient_id: 'me-storybook',
    body: 'この曲どう？',
    track_id: null,
    created_at: '2026-09-21T00:00:00.000Z',
    tracks: null,
  },
  {
    id: 'msg-2',
    sender_id: 'me-storybook',
    recipient_id: 'partner-1',
    body: 'かなり好きです。',
    track_id: 'track-share',
    created_at: '2026-09-21T00:01:00.000Z',
    tracks: {
      id: 'track-share',
      title: 'Shared Track',
      artists: { id: 'artist-share', name: 'Shared Artist' },
    },
  },
]

const openThreadParameters = {
  nextjs: {
    navigation: {
      pathname: '/messages',
      query: { with: 'partner-1' },
    },
  },
  mockApi: {
    'GET /api/messages/conversations': { body: { conversations } },
    'GET /api/messages': { body: { messages: thread } },
  },
}

const meta = {
  title: 'Pages/Social/Messages',
  component: MessagesPage,
  parameters: {
    nextjs: { navigation: { pathname: '/messages' } },
  },
}

export default meta

export const ConversationList = {
  parameters: {
    mockApi: {
      'GET /api/messages/conversations': { body: { conversations } },
    },
  },
}

export const OpenThread = {
  parameters: openThreadParameters,
}

export const EnterToSend = {
  parameters: {
    ...openThreadParameters,
    mockApi: {
      ...openThreadParameters.mockApi,
      'POST /api/messages': {
        body: {
          message: {
            id: 'msg-new',
            sender_id: 'me-storybook',
            recipient_id: 'partner-1',
            body: 'Enterで送信',
            track_id: null,
            created_at: '2026-09-21T00:02:00.000Z',
          },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = await canvas.findByLabelText('メッセージ本文')
    await userEvent.type(input, 'Enterで送信{enter}')
    await expect(input).toHaveValue('')
  },
}

export const MobileOpenThread = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  parameters: openThreadParameters,
}
