import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import PrivacyRequestsPage from '../../app/[locale]/(player)/privacy-requests/page'

const meta = {
  title: 'Pages/Account/PrivacyRequests',
  component: PrivacyRequestsPage,
  parameters: {
    nextjs: { navigation: { pathname: '/privacy-requests' } },
  },
}

export default meta

export const EmptyHistory = {
  parameters: { mockApi: { 'GET /api/privacy/requests': { body: { requests: [] } } } },
}

export const WithHistory = {
  parameters: {
    mockApi: {
      'GET /api/privacy/requests': {
        body: { requests: [
          { id: 'pr-1', request_type: 'access', details: '自分の再生履歴を確認したい', status: 'completed', response: 'データを準備しました。', created_at: '2026-08-20T00:00:00.000Z', responded_at: '2026-08-25T00:00:00.000Z' },
          { id: 'pr-2', request_type: 'rectification', details: 'プロフィール情報の訂正', status: 'in_progress', response: null, created_at: '2026-09-15T00:00:00.000Z', responded_at: null },
        ] },
      },
      'POST /api/privacy/requests': { body: { request: { id: 'pr-new', request_type: 'access', details: '', status: 'received', response: null, created_at: '2026-09-21T00:00:00.000Z', responded_at: null } } },
    },
  },
}

export const SubmitSuccess = {
  parameters: {
    mockApi: {
      'GET /api/privacy/requests': { body: { requests: [] } },
      'POST /api/privacy/requests': {
        body: {
          request: {
            id: 'pr-new',
            request_type: 'access',
            details: '再生履歴を確認したい',
            status: 'received',
            response: null,
            created_at: '2026-09-21T00:00:00.000Z',
            responded_at: null,
          },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('詳細・対象データ（任意）'), '再生履歴を確認したい')
    await userEvent.click(canvas.getByRole('button', { name: '請求を送信する' }))
    await expect(await canvas.findByRole('status')).toHaveTextContent('請求を受け付けました')
    await expect(canvas.getByText('再生履歴を確認したい')).toBeVisible()
  },
}

export const SubmitFailure = {
  parameters: {
    mockApi: {
      'GET /api/privacy/requests': { body: { requests: [] } },
      'POST /api/privacy/requests': {
        status: 500,
        body: { code: 'privacy_request_failed' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '請求を送信する' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('送信できませんでした')
  },
}

export const DetailsMaxLength = {
  parameters: {
    mockApi: {
      'GET /api/privacy/requests': { body: { requests: [] } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const details = await canvas.findByLabelText('詳細・対象データ（任意）')
    await userEvent.type(details, 'x'.repeat(2001))
    await expect(details.value).toHaveLength(2000)
    await expect(canvas.getByText('2000/2000')).toBeVisible()
  },
}

export const MobileNoHorizontalOverflow = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  parameters: {
    mockApi: {
      'GET /api/privacy/requests': { body: { requests: [] } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByLabelText('請求の種類')).toBeVisible()
    const doc = canvasElement.ownerDocument
    await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
  },
}
