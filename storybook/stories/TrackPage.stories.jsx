import React from 'react'
import TrackPage from '../../app/[locale]/(player)/track/page'

const meta = {
  title: 'Pages/Music/TrackDetail',
  component: TrackPage,
  parameters: {
    nextjs: { navigation: { pathname: '/track', query: { id: 'track-storybook' } } },
  },
}

export default meta

export const Found = {
  parameters: {
    mockApi: {
      'GET /api/tracks/track-storybook': {
        body: {
          track: {
            id: 'track-storybook',
            title: 'Storybook Single',
            duration_sec: 214,
            ai_generated: false,
            cumulative_plays: 2048,
            album_id: 'album-storybook',
            artists: { id: 'artist-storybook', name: 'Track Artist', founding_artist: true },
            albums: { id: 'album-storybook', title: 'Storybook Album', cover_r2_key: null, cover_url: null },
          },
        },
      },
      'GET /api/boost': { body: { used: 0, remaining: 20, free_remaining: 2, price_yen: 30 } },
      'POST /api/supports': { body: { ok: true, type: 'heart' } },
      'POST /api/boost': { body: { ok: true, type: 'free', remaining: 19 } },
      'GET /api/tracks/track-storybook/support-graph': { body: { supporters: [], total_support_count: 8 } },
      'GET /api/tracks/track-storybook/lyrics': { body: { lyrics: null } },
    },
  },
}

export const NotFound = {
  parameters: {
    mockApi: {
      'GET /api/tracks/track-storybook': { status: 404, body: { error: 'not found' } },
    },
  },
}
