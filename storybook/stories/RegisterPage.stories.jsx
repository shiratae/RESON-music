import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import RegisterPage from '../../app/[locale]/(auth)/register/page'

const successMocks = {
  'POST /api/auth/register': {
    body: { needs_email_confirmation: false },
  },
}

async function fillAccount(canvas, { confirm = 'password1' } = {}) {
  await userEvent.type(canvas.getByLabelText('メールアドレス'), 'listener@example.com')
  await userEvent.type(canvas.getByLabelText('パスワード', { selector: '#register-password' }), 'password1')
  await userEvent.type(canvas.getByLabelText('パスワード（確認）'), confirm)
}

const meta = {
  title: 'Pages/Auth/Register',
  component: RegisterPage,
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/register',
      },
    },
    mockApi: successMocks,
  },
}

export default meta

export const AccountStep = {}

export const ReferralEntry = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/register',
        query: { ref: 'storybook-referral' },
      },
    },
  },
}

export const PasswordMismatch = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fillAccount(canvas, { confirm: 'password2' })
    await userEvent.click(canvas.getByRole('button', { name: 'アカウントを作成' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('パスワードが一致しません')
  },
}

export const RegistrationApiFailure = {
  parameters: {
    mockApi: {
      'POST /api/auth/register': {
        status: 409,
        body: { code: 'account_creation_failed' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fillAccount(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'アカウントを作成' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('登録を完了できませんでした。時間をおいて再試行してください。')
  },
}

export const RegistrationLoading = {
  parameters: {
    mockApi: {
      'POST /api/auth/register': async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        return { body: { needs_email_confirmation: false } }
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fillAccount(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'アカウントを作成' }))
    await expect(canvas.getByRole('button', { name: '登録中…' })).toBeDisabled()
    await expect(await canvas.findByText('RESONをどう使いますか？')).toBeVisible()
  },
}

export const MinorArtistRequiresParentDetails = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fillAccount(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'アカウントを作成' }))
    await userEvent.click(await canvas.findByRole('button', { name: /アーティストとして始める/ }))

    await userEvent.type(canvas.getByLabelText(/アーティスト名/), 'Storybook Artist')
    await userEvent.click(canvas.getByRole('button', { name: '次へ（出金先の登録）' }))

    await userEvent.type(canvas.getByLabelText(/銀行名/), 'テスト銀行')
    await userEvent.type(canvas.getByLabelText(/支店名/), 'テスト支店')
    await userEvent.type(canvas.getByLabelText(/口座番号/), '1234567')
    await userEvent.type(canvas.getByLabelText(/口座名義/), 'テスト アーティスト')
    await userEvent.click(canvas.getByRole('button', { name: '次へ（権利確認）' }))

    await userEvent.click(canvas.getByRole('checkbox', { name: '上記の内容に同意します' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: /未成年です/ }))
    await expect(canvas.getByLabelText('保護者の氏名')).toBeVisible()
    await expect(canvas.getByLabelText('保護者の連絡先')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '登録を申請する' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('未成年の場合は保護者の氏名・連絡先が必要です')
  },
}

export const MobileNoHorizontalOverflow = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument
    await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
  },
}
