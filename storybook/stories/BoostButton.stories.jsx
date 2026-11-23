import React from 'react'
import { BoostButton } from '../../components/BoostButton'

const meta = {
  title: 'Music/BoostButton',
  component: BoostButton,
  args: {
    trackId: 'storybook-track',
  },
}

export default meta

export const FreeBoostsAvailable = {
  parameters: {
    mockApi: {
      'GET /api/boost': {
        body: { used: 1, remaining: 22, free_remaining: 2, price_yen: 30 },
      },
      'POST /api/boost': {
        body: { ok: true, type: 'free', remaining: 21 },
      },
    },
  },
}

export const MonthlyLimitReached = {
  parameters: {
    mockApi: {
      'GET /api/boost': {
        body: { used: 23, remaining: 0, free_remaining: 0, price_yen: 30 },
      },
    },
  },
}
