import React from 'react'
import NotificationsPage from '../../app/[locale]/(player)/notifications/page'

const meta = {
  title: 'Pages/Social/Notifications',
  component: NotificationsPage,
  parameters: {
    nextjs: { navigation: { pathname: '/notifications' } },
  },
}

export default meta

export const Empty = {
  parameters: {
    mockApi: {
      'GET /api/notifications': { body: { notifications: [] } },
      'PATCH /api/notifications': { body: { ok: true } },
    },
  },
}

export const WithNotifications = {
  parameters: {
    mockApi: {
      'GET /api/notifications': {
        body: {
          notifications: [
            {
              id: 'notification-1',
              type: 'support',
              actor_user_id: 'user-1',
              target_type: 'track',
              target_id: 'track-1',
              read_at: null,
              created_at: '2026-09-21T00:00:00.000Z',
            },
            {
              id: 'notification-2',
              type: 'message',
              actor_user_id: 'user-2',
              target_type: 'message',
              target_id: 'message-1',
              read_at: '2026-09-21T00:02:00.000Z',
              created_at: '2026-09-20T23:30:00.000Z',
            },
          ],
        },
      },
      'PATCH /api/notifications': { body: { ok: true } },
    },
  },
}
