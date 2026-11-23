import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import PricingPage from '../../app/[locale]/(player)/pricing/page'

const checkoutMocks = {
  'POST /api/stripe/checkout': {
    body: { url: '/pricing?success=1' },
  },
  'POST /api/stripe/portal': {
    body: { url: '/pricing' },
  },
  'POST /api/student/verify/request': {
    body: { ok: true },
  },
  'POST /api/student/verify/confirm': {
    body: { ok: true },
  },
}

const meta = {
  title: 'Pages/Listener/Pricing',
  component: PricingPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/pricing',
      },
    },
    mockApi: checkoutMocks,
  },
}

export default meta

export const Default = {}

export const SubscriptionSuccess = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/pricing',
        query: { success: '1' },
      },
    },
  },
}

export const StudentVerification = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Student に登録' }))
    await expect(canvas.getByText('Studentプラン認証')).toBeVisible()
    await expect(canvas.getByLabelText('学校発行のメールアドレス')).toBeVisible()
  },
}

export const StudentVerificationError = {
  parameters: {
    mockApi: {
      ...checkoutMocks,
      'POST /api/student/verify/request': {
        status: 400,
        body: { code: 'invalid_school_email' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Student に登録' }))
    await userEvent.type(canvas.getByLabelText('学校発行のメールアドレス'), 'student@example.com')
    await userEvent.click(canvas.getByRole('button', { name: '認証コードを送信' }))
    await expect(canvas.getByRole('alert')).toHaveTextContent('認証コードを送信できませんでした。学校のメールアドレスを確認してもう一度お試しください。')
  },
}

export const StudentCodeRequiresSixDigits = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Student に登録' }))
    await userEvent.type(canvas.getByLabelText('学校発行のメールアドレス'), 'student@school.ed.jp')
    await userEvent.click(canvas.getByRole('button', { name: '認証コードを送信' }))

    const code = await canvas.findByLabelText('Student認証コード')
    const confirm = canvas.getByRole('button', { name: '確認して登録へ進む' })

    await userEvent.type(code, '12a34')
    await expect(code).toHaveValue('1234')
    await expect(confirm).toBeDisabled()

    await userEvent.type(code, '56')
    await expect(code).toHaveValue('123456')
    await expect(confirm).toBeEnabled()

    await userEvent.type(code, '789')
    await expect(code).toHaveValue('123456')
  },
}

export const MobileStudentVerification = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Student に登録' }))
    await expect(canvas.getByText('Studentプラン認証')).toBeVisible()
    const doc = canvasElement.ownerDocument
    await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
  },
}
