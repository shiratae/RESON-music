import React from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { SupportButton } from '../../components/SupportButton'

const meta = {
  title: 'Music/SupportButton',
  component: SupportButton,
  args: {
    trackId: 'storybook-track',
  },
  parameters: {
    mockApi: {
      'POST /api/supports': {
        body: { ok: true, type: 'heart' },
      },
    },
  },
}

export default meta

export const Default = {}

export const TipDialog = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /投げ銭/ }))
    await expect(canvas.getByText('投げ銭する')).toBeVisible()
    await expect(canvas.getByRole('button', { name: '¥100 を送る' })).toBeVisible()
  },
}

export const FocusTrap = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /投げ銭/ }))
    const closeButton = canvas.getByRole('button', { name: '投げ銭ダイアログを閉じる' })
    const sendButton = canvas.getByRole('button', { name: '¥100 を送る' })
    await expect(closeButton).toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(sendButton).toHaveFocus()
    await userEvent.tab()
    await expect(closeButton).toHaveFocus()
  },
}

export const BackdropDismissRestoresFocus = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: /投げ銭/ })
    await userEvent.click(trigger)
    const dialog = canvas.getByRole('dialog')
    const backdrop = dialog.parentElement
    await expect(backdrop).not.toBeNull()
    await userEvent.click(backdrop)
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    await expect(trigger).toHaveFocus()
  },
}

export const KeyboardDismiss = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /投げ銭/ }))
    const closeButton = canvas.getByRole('button', { name: '投げ銭ダイアログを閉じる' })
    await expect(closeButton).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /投げ銭/ })).toHaveFocus()
  },
}

export const DeferredTipSuccess = {
  parameters: {
    mockApi: {
      'POST /api/supports': {
        body: { ok: true, type: 'tip_deferred' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /投げ銭/ }))
    await userEvent.click(canvas.getByRole('button', { name: '¥300' }))
    await userEvent.click(canvas.getByRole('button', { name: '¥300 を送る' }))
    await expect(canvas.getByRole('button', { name: /送りました/ })).toBeVisible()
  },
}

export const ApiError = {
  parameters: {
    mockApi: {
      'POST /api/supports': {
        status: 500,
        body: { code: 'support_failed' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /応援$/ }))
    await expect(canvas.getByText('応援の処理に失敗しました。もう一度お試しください。')).toBeVisible()
  },
}
