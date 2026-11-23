import React from 'react'
import { Player } from '../../components/Player'

const apiMocks = {
  'GET /api/boost': {
    body: { used: 0, remaining: 23, free_remaining: 3, price_yen: 30 },
  },
  'GET /api/tracks/storybook-track/support-graph': {
    body: {
      supporters: [
        { user_id: 'listener-1', display_name: 'Listener A' },
        { user_id: 'listener-2', display_name: 'Listener B' },
      ],
      total_support_count: 2,
    },
  },
  'GET /api/tracks/storybook-track/lyrics': {
    body: { lyrics: 'Storybook preview lyrics' },
  },
  'POST /api/supports': {
    body: { ok: true, type: 'heart' },
  },
  'POST /api/boost': {
    body: { ok: true, type: 'free', remaining: 22 },
  },
}

const meta = {
  title: 'Music/Player',
  component: Player,
  args: {
    track: {
      id: 'storybook-track',
      title: 'Storybook Track',
      duration_sec: 245,
      artists: { name: 'RESON Demo Artist' },
    },
  },
  parameters: {
    mockApi: apiMocks,
  },
}

export default meta

export const Default = {}

export const LongMetadata = {
  args: {
    track: {
      id: 'storybook-track',
      title: 'A Very Long Track Title Used To Verify Truncation And Layout Stability In The Player Component',
      duration_sec: 3725,
      artists: {
        name: 'An Artist With A Deliberately Long Display Name For Component Layout Testing',
      },
    },
  },
}

export const WithQueueControls = {
  args: {
    controls: {
      onPrev: () => {},
      onNext: () => {},
      hasNext: true,
      hasPrev: true,
      shuffleOn: false,
      onToggleShuffle: () => {},
      repeatMode: 'off',
      onCycleRepeat: () => {},
      queueCount: 3,
    },
  },
}
