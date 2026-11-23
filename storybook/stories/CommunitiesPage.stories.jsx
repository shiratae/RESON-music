import React from 'react'
import CommunitiesPage from '../../app/[locale]/(player)/communities/page'

const meta = {
  title: 'Pages/Social/Communities',
  component: CommunitiesPage,
  parameters: {
    nextjs: { navigation: { pathname: '/communities' } },
  },
}

export default meta

export const MixedMembership = {
  parameters: {
    mockApi: {
      'GET /api/communities': {
        body: {
          communities: [
            {
              id: 'genre-rock',
              name: 'Rock',
              parent_id: null,
              member_count: 128,
              joined: true,
            },
            {
              id: 'genre-jazz',
              name: 'Jazz',
              parent_id: null,
              member_count: 64,
              joined: false,
            },
          ],
        },
      },
      'POST /api/communities': { body: { ok: true } },
      'DELETE /api/communities': { body: { ok: true } },
    },
  },
}
