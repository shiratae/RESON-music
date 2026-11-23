import React from 'react'
import LoginPage from '../../app/[locale]/(auth)/login/page'

const meta = {
  title: 'Pages/Auth/Login',
  component: LoginPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/login',
      },
    },
  },
}

export default meta

export const Default = {}

export const ReferralEntry = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/login',
        query: { ref: 'storybook-referral' },
      },
    },
  },
}
