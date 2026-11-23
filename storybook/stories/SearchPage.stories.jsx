import React from 'react'
import SearchPage from '../../app/[locale]/(player)/search/page'

const meta = {
  title: 'Pages/Listener/Search',
  component: SearchPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/search',
      },
    },
  },
}

export default meta

export const ComingSoon = {}
