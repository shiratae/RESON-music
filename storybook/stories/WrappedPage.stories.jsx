import React from 'react'
import WrappedPage from '../../app/[locale]/(player)/wrapped/page'

const meta = {
  title: 'Pages/Listener/Wrapped',
  component: WrappedPage,
  parameters: { nextjs: { navigation: { pathname: '/wrapped' } } },
}

export default meta

export const NoListeningData = {
  parameters: {
    mockApi: {
      'GET /api/wrapped': { body: { year: 2026, total_played_sec: 0, total_plays: 0, completed_plays: 0, distinct_tracks: 0, top_tracks: [], top_artists: [] } },
    },
  },
}

export const Summary = {
  parameters: {
    mockApi: {
      'GET /api/wrapped': {
        body: {
          year: 2026,
          total_played_sec: 182400,
          total_plays: 426,
          completed_plays: 281,
          distinct_tracks: 93,
          top_artists: [
            { artist_id: 'wa-1', name: 'Wrapped Artist', played_sec: 42000 },
            { artist_id: 'wa-2', name: 'Second Artist', played_sec: 31800 },
          ],
          top_tracks: [
            { track_id: 'wt-1', title: 'Most Played', artist_name: 'Wrapped Artist', played_sec: 16200, play_count: 42 },
            { track_id: 'wt-2', title: 'Second Most Played', artist_name: 'Second Artist', played_sec: 12300, play_count: 31 },
          ],
        },
      },
    },
  },
}
