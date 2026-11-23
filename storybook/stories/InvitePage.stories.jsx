import React from 'react'
import InvitePage from '../../app/[locale]/(player)/invite/page'

const meta = {
  title: 'Pages/Account/Invite',
  component: InvitePage,
  parameters: { nextjs: { navigation: { pathname: '/invite' } } },
}

export default meta

export const LoggedOut = {
  parameters: { mockApi: { 'GET /api/referral/me': { status: 401, body: { error: 'unauthorized' } } } },
}

export const ReferralReady = {
  parameters: {
    mockApi: {
      'GET /api/referral/me': {
        body: {
          referral_code: 'STORYBOOK42',
          invited_count: 3,
          invited_at: ['2026-09-01T00:00:00.000Z', '2026-09-08T00:00:00.000Z', '2026-09-15T00:00:00.000Z'],
        },
      },
    },
  },
}
