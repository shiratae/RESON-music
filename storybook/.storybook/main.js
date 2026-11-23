/** @type { import('@storybook/nextjs-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
}

export default config
