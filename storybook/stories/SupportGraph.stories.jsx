import React from 'react'
import { SupportGraph } from '../../components/SupportGraph'

const meta = {
  title: 'Music/SupportGraph',
  component: SupportGraph,
  args: {
    trackId: 'storybook-support-track',
  },
}

export default meta

export const FriendsSupporting = {
  parameters: {
    mockApi: {
      'GET /api/tracks/storybook-support-track/support-graph': {
        body: {
          supporters: [
            { user_id: '1', display_name: 'Aki' },
            { user_id: '2', display_name: 'Mio' },
            { user_id: '3', display_name: 'Ren' },
            { user_id: '4', display_name: 'Sora' },
          ],
          total_support_count: 12,
        },
      },
    },
  },
}

export const AggregateOnly = {
  parameters: {
    mockApi: {
      'GET /api/tracks/storybook-support-track/support-graph': {
        body: {
          supporters: [],
          total_support_count: 28,
        },
      },
    },
  },
}

export const NoSupportYet = {
  parameters: {
    mockApi: {
      'GET /api/tracks/storybook-support-track/support-graph': {
        body: {
          supporters: [],
          total_support_count: 0,
        },
      },
    },
  },
}
