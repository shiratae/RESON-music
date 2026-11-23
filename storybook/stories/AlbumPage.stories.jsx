import React from 'react'
import AlbumDetailPage from '../../app/[locale]/(player)/albums/page'

const playerMocks = {
  'GET /api/boost': {
    body: { used: 0, remaining: 23, free_remaining: 3, price_yen: 30 },
  },
  'POST /api/supports': { body: { ok: true, type: 'heart' } },
  'POST /api/boost': { body: { ok: true, type: 'free', remaining: 22 } },
  'GET /api/tracks/album-track-1/support-graph': {
    body: { supporters: [], total_support_count: 7 },
  },
  'GET /api/tracks/album-track-1/lyrics': { body: { lyrics: null } },
}

const meta = {
  title: 'Pages/Music/AlbumDetail',
  component: AlbumDetailPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/albums',
        query: { id: 'album-storybook' },
      },
    },
  },
}

export default meta

export const WithTracks = {
  parameters: {
    mockApi: {
      ...playerMocks,
      'GET /api/albums/album-storybook': {
        body: {
          album: {
            id: 'album-storybook',
            title: 'Storybook Album',
            cover_url: null,
            cover_r2_key: null,
            released_at: '2026-09-01T00:00:00.000Z',
            release_type: 'album',
            artists: { id: 'album-artist', name: 'Album Artist' },
          },
          tracks: [
            {
              id: 'album-track-1',
              title: 'Album Opener',
              duration_sec: 210,
              track_number: 1,
              cumulative_plays: 520,
              ai_generated: false,
            },
            {
              id: 'album-track-2',
              title: 'Album Closer',
              duration_sec: 245,
              track_number: 2,
              cumulative_plays: 340,
              ai_generated: true,
            },
          ],
          total_duration_sec: 455,
        },
      },
    },
  },
}

export const NotFound = {
  parameters: {
    mockApi: {
      'GET /api/albums/album-storybook': { body: {} },
    },
  },
}
