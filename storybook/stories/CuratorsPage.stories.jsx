import React from 'react'
import CuratorsPage from '../../app/[locale]/(player)/curators/page'

const meta = {
  title: 'Pages/Discovery/Curators',
  component: CuratorsPage,
  parameters: { nextjs: { navigation: { pathname: '/curators' } } },
}

export default meta

export const Empty = {
  parameters: { mockApi: { 'GET /api/curator/leaderboard': { body: { leaderboard: [] } } } },
}

export const Ranked = {
  parameters: {
    mockApi: {
      'GET /api/curator/leaderboard': {
        body: { leaderboard: [
          { user_id: 'curator-1', display_name: 'Early Listener', score: 420 },
          { user_id: 'curator-2', display_name: 'Deep Digger', score: 315 },
        ] },
      },
    },
  },
}
