import React from 'react'
import { expect } from 'storybook/test'
import HomePage from '../../app/[locale]/(player)/home/page'

const tracks = [
  { id: 'home-track-1', title: 'Home Track One', duration_sec: 210, ai_generated: false, cumulative_plays: 1200, artists: { id: 'artist-1', name: 'Home Artist' } },
  { id: 'home-track-2', title: 'Home Track Two', duration_sec: 188, ai_generated: true, cumulative_plays: 680, artists: { id: 'artist-2', name: 'Second Artist' } },
]

const playerMocks = {
  'GET /api/boost': { body: { used: 0, remaining: 23, free_remaining: 3, price_yen: 30 } },
  'POST /api/supports': { body: { ok: true, type: 'heart' } },
  'POST /api/boost': { body: { ok: true, type: 'free', remaining: 22 } },
  'GET /api/tracks/home-track-1/support-graph': { body: { supporters: [], total_support_count: 5 } },
  'GET /api/tracks/home-track-1/lyrics': { body: { lyrics: null } },
}

const populatedMocks = {
  ...playerMocks,
  'GET /api/tracks/list': { body: { tracks } },
  'GET /api/recommendations/heat': {
    body: { tracks: [{ ...tracks[1], completion_rate: 0.76, support_rate: 0.23, heat_score: 0.81 }] },
  },
  'GET /api/recommendations/foryou': {
    body: { tracks: [{ ...tracks[0], completion_rate: 0.84, support_rate: 0.29, heat_score: 0.88, because_you_like: true }] },
  },
  'GET /api/explore': {
    body: { tracks: [{ id: 'explore-home-1', title: 'Hidden Gem', cumulative_plays: 420, artist: { id: 'artist-3', name: 'Hidden Artist' }, genres: ['Indie'] }] },
  },
  'GET /api/artist/status': { body: { has_artist: true } },
}

const meta = {
  title: 'Pages/Listener/Home',
  component: HomePage,
  parameters: {
    nextjs: { navigation: { pathname: '/home' } },
  },
}

export default meta

export const EmptyLibrary = {
  parameters: {
    mockApi: {
      'GET /api/tracks/list': { body: { tracks: [] } },
      'GET /api/recommendations/heat': { body: { tracks: [] } },
      'GET /api/recommendations/foryou': { body: { tracks: [] } },
      'GET /api/explore': { body: { tracks: [] } },
      'GET /api/artist/status': { body: { has_artist: false } },
    },
  },
}

export const Populated = {
  parameters: {
    mockApi: populatedMocks,
  },
}

export const MobilePopulated = {
  globals: {
    viewport: { value: 'mobile2', isRotated: false },
  },
  parameters: {
    mockApi: populatedMocks,
  },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument
    await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
  },
}
