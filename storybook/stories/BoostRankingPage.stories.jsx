import React from 'react'
import BoostRankingPage from '../../app/[locale]/(player)/boost-ranking/page'

const meta = {
  title: 'Pages/Discovery/BoostRanking',
  component: BoostRankingPage,
  parameters: { nextjs: { navigation: { pathname: '/boost-ranking' } } },
}

export default meta

export const Empty = {
  parameters: { mockApi: { 'GET /api/boost/weekly-ranking': { body: { tracks: [] } } } },
}

export const Ranked = {
  parameters: {
    mockApi: {
      'GET /api/boost/weekly-ranking': {
        body: { tracks: [
          { id: 'rank-1', title: 'Rising Track', cumulative_plays: 830, artists: { id: 'a1', name: 'Rising Artist' }, this_week_boosts: 18, last_week_boosts: 4, growth_rate: 3.5 },
          { id: 'rank-2', title: 'Momentum', cumulative_plays: 1240, artists: { id: 'a2', name: 'Momentum Artist' }, this_week_boosts: 14, last_week_boosts: 5, growth_rate: 1.8 },
        ] },
      },
    },
  },
}
