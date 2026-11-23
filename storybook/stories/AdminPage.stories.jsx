import React from 'react'
import AdminPage from '../../app/[locale]/(admin)/admin/page'

const baseMocks = {
  'GET /api/admin/artists': {
    body: { artists: [{ id: 'admin-artist-1', name: 'Pending Artist', bio: '審査用プロフィール', is_minor: false, created_at: '2026-09-20T00:00:00.000Z' }] },
  },
  'GET /api/admin/tracks': {
    body: { tracks: [{ id: 'admin-track-1', title: 'Pending Track', ai_generated: false, recording_type: 'original', content_category: 'none', rights_confirmed: false, created_at: '2026-09-20T00:00:00.000Z', artists: { id: 'admin-artist-1', name: 'Pending Artist' } }] },
  },
  'GET /api/admin/fraud-flags': {
    body: { flags: [{ id: 'flag-1', track_id: 'admin-track-1', user_id: 'user-1', flag_type: 'rapid_replay', level: 2, created_at: '2026-09-20T00:00:00.000Z', tracks: { id: 'admin-track-1', title: 'Pending Track', fraud_suspended: true } }] },
  },
  'GET /api/admin/reports': {
    body: { reports: [{ id: 'report-1', reporter_id: 'user-r', target_type: 'post', target_id: 'post-1', reason: '確認が必要な投稿', status: 'pending', created_at: '2026-09-20T00:00:00.000Z' }] },
  },
  'GET /api/admin/payouts': {
    body: { requests: [{ id: 'payout-1', artist_id: 'admin-artist-1', amount_yen: 12000, status: 'pending', requested_at: '2026-09-20T00:00:00.000Z', artists: { id: 'admin-artist-1', name: 'Pending Artist' } }] },
  },
}

const meta = {
  title: 'Pages/Admin/Dashboard',
  component: AdminPage,
  parameters: { nextjs: { navigation: { pathname: '/admin' } } },
}

export default meta

export const Denied = {
  parameters: { mockApi: { 'GET /api/admin/me': { body: { is_admin: false } } } },
}

export const ReviewQueues = {
  parameters: {
    mockApi: {
      'GET /api/admin/me': { body: { is_admin: true } },
      ...baseMocks,
    },
  },
}
