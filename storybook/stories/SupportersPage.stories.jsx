import React from 'react'
import SupportersPage from '../../app/[locale]/(artist)/supporters/page'

const meta = {
  title: 'Pages/Artist/Supporters',
  component: SupportersPage,
  parameters: { nextjs: { navigation: { pathname: '/supporters' } } },
}

export default meta

export const Empty = {
  parameters: { mockApi: { 'GET /api/artist/supporters': { body: { supporters: [] } } } },
}

export const WithSupporters = {
  parameters: {
    mockApi: {
      'GET /api/artist/supporters': {
        body: { supporters: [
          { user_id: 'supporter-1', display_name: 'Listener One', heart_count: 8, boost_count: 2, tip_total_yen: 1200 },
          { user_id: 'supporter-2', display_name: null, heart_count: 3, boost_count: 0, tip_total_yen: 0 },
        ] },
      },
    },
  },
}
