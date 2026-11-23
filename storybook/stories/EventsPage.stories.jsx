import React from 'react'
import EventsPage from '../../app/[locale]/(player)/events/page'

const meta = {
  title: 'Pages/Social/Events',
  component: EventsPage,
  parameters: {
    nextjs: { navigation: { pathname: '/events' } },
  },
}

export default meta

export const Empty = {
  parameters: {
    mockApi: {
      'GET /api/events': { body: { events: [] } },
    },
  },
}

export const WithUpcomingEvents = {
  parameters: {
    mockApi: {
      'GET /api/events': {
        body: {
          events: [
            {
              id: 'event-storybook',
              artist_id: 'artist-event',
              title: 'RESON Storybook Live',
              description: 'Storybookでイベントカードを確認するライブです。',
              event_at: '2026-10-10T10:00:00.000Z',
              location: 'Tokyo',
              ticket_url: 'https://example.com/tickets',
              artists: { id: 'artist-event', name: 'Event Artist' },
            },
          ],
        },
      },
      'POST /api/events/event-storybook/attend': { body: { ok: true } },
      'DELETE /api/events/event-storybook/attend': { body: { ok: true } },
    },
  },
}
