import React from 'react'
import ExplorePage from '../../app/[locale]/(player)/explore/page'

const meta = {
  title: 'Pages/Listener/Explore',
  component: ExplorePage,
  parameters: {
    nextjs: { navigation: { pathname: '/explore' } },
  },
}

export default meta

export const Empty = {
  parameters: {
    mockApi: {
      'GET /api/explore': { body: { tracks: [] } },
    },
  },
}

export const WithDiscoveries = {
  parameters: {
    mockApi: {
      'GET /api/explore': {
        body: {
          tracks: [
            {
              id: 'explore-1',
              title: 'Night Discovery',
              duration_sec: 221,
              cumulative_plays: 420,
              artist: { id: 'artist-1', name: 'Midnight Artist' },
              genres: ['City Pop', 'Indie'],
            },
            {
              id: 'explore-2',
              title: 'Small Room',
              duration_sec: 189,
              cumulative_plays: 1280,
              artist: { id: 'artist-2', name: 'Bedroom Band' },
              genres: ['Alternative'],
            },
          ],
        },
      },
    },
  },
}
