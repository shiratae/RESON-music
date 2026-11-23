import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import UploadPage from '../../app/[locale]/(artist)/upload/page'

const emptyMocks = {
  'GET /api/genres': { body: { genres: [] } },
  'GET /api/albums': { body: { albums: [] } },
}

const meta = {
  title: 'Pages/Artist/Upload',
  component: UploadPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/upload',
      },
    },
  },
}

export default meta

export const Empty = {
  parameters: {
    mockApi: emptyMocks,
  },
}

export const WithGenresAndAlbums = {
  parameters: {
    mockApi: {
      'GET /api/genres': {
        body: {
          genres: [
            { id: 'pop', name: 'Pop', parent_id: null },
            { id: 'rock', name: 'Rock', parent_id: null },
            { id: 'alt-rock', name: 'Alternative Rock', parent_id: 'rock' },
          ],
        },
      },
      'GET /api/albums': {
        body: {
          albums: [
            {
              id: 'album-1',
              title: 'Storybook Album',
              release_type: 'album',
              cover_r2_key: null,
            },
          ],
        },
      },
    },
  },
}

export const InvalidAudioType = {
  parameters: {
    mockApi: emptyMocks,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('楽曲ファイル')
    input.setAttribute('accept', '')
    const file = new File(['not audio'], 'notes.txt', { type: 'text/plain' })
    await userEvent.upload(input, file)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('対応形式: MP3 / M4A / FLAC / WAV / OGG')
  },
}

export const OversizeAudio = {
  parameters: {
    mockApi: emptyMocks,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('楽曲ファイル')
    const file = new File(['tiny'], 'oversize.wav', { type: 'audio/wav' })
    Object.defineProperty(file, 'size', { value: 201 * 1024 * 1024 })
    await userEvent.upload(input, file)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('ファイルサイズは200MB以内にしてください')
  },
}

export const MobileNoHorizontalOverflow = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  parameters: {
    mockApi: emptyMocks,
  },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument
    await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
  },
}
