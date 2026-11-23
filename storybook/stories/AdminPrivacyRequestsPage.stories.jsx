import React from 'react'
import AdminPrivacyRequestsPage from '../../app/[locale]/(admin)/admin/privacy-requests/page'

const meta = {
  title: 'Pages/Admin/PrivacyRequests',
  component: AdminPrivacyRequestsPage,
  parameters: { nextjs: { navigation: { pathname: '/admin/privacy-requests' } } },
}

export default meta

export const Empty = {
  parameters: { mockApi: { 'GET /api/admin/privacy-requests': { body: { requests: [] } } } },
}

export const WithRequests = {
  parameters: {
    mockApi: {
      'GET /api/admin/privacy-requests': {
        body: { requests: [
          { id: 'apr-1', user_id: 'user-privacy-1', request_type: 'access', details: '再生履歴とプロフィール情報', status: 'received', response: null, created_at: '2026-09-10T00:00:00.000Z', responded_at: null },
          { id: 'apr-2', user_id: 'user-privacy-2', request_type: 'erasure', details: 'アカウント削除', status: 'completed', response: '本人確認後に削除しました。', created_at: '2026-08-01T00:00:00.000Z', responded_at: '2026-08-05T00:00:00.000Z' },
        ] },
      },
      'PATCH /api/admin/privacy-requests': { body: { request: { status: 'in_progress' } } },
    },
  },
}
