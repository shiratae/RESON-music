import React from 'react'
import ParentalPage from '../../app/[locale]/(player)/parental/page'

const meta = {
  title: 'Pages/Account/Parental',
  component: ParentalPage,
  parameters: {
    nextjs: { navigation: { pathname: '/parental' } },
  },
}

export default meta

export const Unlinked = {
  parameters: {
    mockApi: {
      'GET /api/parental/status': {
        body: { linked: false, pending_token: null },
      },
      'POST /api/parental/request': {
        body: { token: 'storybook-parental-token' },
      },
    },
  },
}

export const PendingApproval = {
  parameters: {
    mockApi: {
      'GET /api/parental/status': {
        body: { linked: false, pending_token: 'storybook-parental-token' },
      },
    },
  },
}

export const Linked = {
  parameters: {
    mockApi: {
      'GET /api/parental/status': {
        body: { linked: true, pending_token: null },
      },
    },
  },
}
