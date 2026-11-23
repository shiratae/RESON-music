import React from 'react'
import LibraryPage from '../../app/[locale]/(player)/library/page'

const playerMocks = {
  'GET /api/boost': {
    body: { used: 0, remaining: 23, free_remaining: 3, price_yen: 30 },
  },
  'POST /api/supports': {
    body: { ok: true, type: 'heart' },
  },
  'POST /api/boost': {
    body: { ok: true, type: 'free', remaining: 22 },
  },
  'GET /api/tracks/library-track-1/support-graph': {
    body: { supporters: [], total_support_count: 3 },
  },
  'GET /api/tracks/library-track-1/lyrics': {
    body: { lyrics: null },
  },
}

const meta = {
  title: 'Pages/Listener/Library',
  component: LibraryPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/library',
      },
    },
  },
}

export default meta

export const Empty = {
  parameters: {
    mockApi: {
      'GET /api/library/liked-tracks': {
        body: { tracks: [] },
      },
    },
  },
}

export const WithLikedTracks = {
  parameters: {
    mockApi: {
      ...playerMocks,
      'GET /api/library/liked-tracks': {
        body: {
          tracks: [
            {
              id: 'library-track-1',
              title: 'Liked Storybook Track',
              duration_sec: 198,
              ai_generated: false,
              artists: { id: 'artist-one', name: 'Artist One' },
            },
            {
              id: 'library-track-2',
              title: 'AI Liked Track',
              duration_sec: 225,
              ai_generated: true,
              artists: { id: 'artist-two', name: 'Artist Two' },
            },
          ],
        },
      },
    },
  },
}
