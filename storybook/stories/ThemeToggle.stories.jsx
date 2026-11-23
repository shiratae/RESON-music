import React from 'react'
import { ThemeToggle } from '../../components/ThemeToggle'

const meta = {
  title: 'Controls/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    a11y: { test: 'error' },
  },
}

export default meta

export const DarkDefault = {
  decorators: [
    (Story) => {
      localStorage.removeItem('reson_theme')
      document.documentElement.setAttribute('data-theme', 'dark')
      return <Story />
    },
  ],
}

export const LightStored = {
  decorators: [
    (Story) => {
      localStorage.setItem('reson_theme', 'light')
      document.documentElement.setAttribute('data-theme', 'light')
      return <Story />
    },
  ],
}
