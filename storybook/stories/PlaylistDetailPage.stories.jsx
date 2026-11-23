import React from 'react'
import PlaylistDetailPage from '../../app/[locale]/(player)/playlists/detail/page'

const track = (id, title, artist) => ({
  position: Number(id.slice(-1)) || 0,
  track_id: id,
  tracks: {
    id,
    title,
    duration_sec: 210,
    ai_generated: false,
    artists: { id: `artist-${id}`, name: artist },
  },
})

const playerMocks = {
  'GET /api/boost': {
    body: { used: 0, remaining: 23, free_remaining: 3, price_yen: 30 },
  },
  'POST /api/supports': {
    body: { ok: true, type: 'heart' },
  },
  'POST /api/boost': {
    body: { ok: true, type: 'free', remaining: 22 },
  },
  'GET /api/tracks/playlist-track-1/support-graph': {
    body: { supporters: [], total_support_count: 4 },
  },
  'GET /api/tracks/playlist-track-1/lyrics': {
    body: { lyrics: null },
  },
}

const meta = {
  title: 'Pages/Listener/PlaylistDetail',
  component: PlaylistDetailPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/playlists/detail',
        query: { id: 'playlist-storybook' },
      },
    },
  },
}

export default meta

export const OwnerWithTracks = {
  parameters: {
    mockApi: {
      ...playerMocks,
      'GET /api/playlists/playlist-storybook': {
        body: {
          playlist: {
            id: 'playlist-storybook',
            user_id: 'user-storybook',
            title: 'Storybook Playlist',
            is_public: true,
          },
          tracks: [
            track('playlist-track-1', 'First Storybook Track', 'Artist One'),
            track('playlist-track-2', 'Second Storybook Track', 'Artist Two'),
          ],
          is_owner: true,
        },
      },
    },
  },
}

export const EmptyOwner = {
  parameters: {
    mockApi: {
      'GET /api/playlists/playlist-storybook': {
        body: {
          playlist: {
            id: 'playlist-storybook',
            user_id: 'user-storybook',
            title: 'Empty Playlist',
            is_public: false,
          },
          tracks: [],
          is_owner: true,
        },
      },
    },
  },
}

export const ReadOnlyPlaylist = {
  parameters: {
    mockApi: {
      ...playerMocks,
      'GET /api/playlists/playlist-storybook': {
        body: {
          playlist: {
            id: 'playlist-storybook',
            user_id: 'other-user',
            title: 'Public Playlist',
            is_public: true,
          },
          tracks: [
            track('playlist-track-1', 'Shared Track', 'Shared Artist'),
          ],
          is_owner: false,
        },
      },
    },
  },
}
