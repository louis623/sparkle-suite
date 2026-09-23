import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getControlCenterAccessMock = vi.fn()
const redirectMock = vi.fn((target: string) => {
  throw new Error(`redirect:${target}`)
})

const { MockAuthError, MockOperatorAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {},
  MockOperatorAuthError: class MockOperatorAuthError extends Error {},
}))

vi.mock('next/navigation', () => ({
  redirect: (target: string) => redirectMock(target),
}))

vi.mock('@/lib/supabase/operator-auth', () => ({
  AuthError: MockAuthError,
  OperatorAuthError: MockOperatorAuthError,
  getControlCenterAccess: (...args: unknown[]) =>
    getControlCenterAccessMock(...args),
}))

vi.mock('@/app/control-center/_components/CommunicationsConsole', () => ({
  CommunicationsConsole: () =>
    createElement('div', null, 'Authenticated broadcasts console'),
}))

vi.mock('@/app/control-center/_components/ControlCenterConversationInbox', () => ({
  ControlCenterConversationInbox: ({ initialConversationId }: { initialConversationId?: string }) =>
    createElement('div', null, `Authenticated support inbox ${initialConversationId ?? ''}`),
}))

vi.mock('@/app/control-center/_components/OwnerDirectMessages', () => ({
  OwnerDirectMessages: () => createElement('div', null, 'Owner private direct messages'),
}))

vi.mock('@/app/control-center/_components/RepNetworkModerationPanel', () => ({
  RepNetworkModerationPanel: () =>
    createElement('div', null, 'Authenticated network safety'),
}))

import ControlCenterMessagesPage from '@/app/control-center/messages/page'

describe('ControlCenterMessagesPage', () => {
  beforeEach(() => {
    getControlCenterAccessMock.mockReset()
    redirectMock.mockClear()
    getControlCenterAccessMock.mockResolvedValue({
      operator: { email: 'owner@example.com' },
      scope: 'owner',
      method: 'control_center_session',
    })
  })

  it('opens Support Inbox by default for an authenticated operator', async () => {
    const page = await ControlCenterMessagesPage({})
    const html = renderToStaticMarkup(page)

    expect(getControlCenterAccessMock).toHaveBeenCalledOnce()
    expect(html).toContain('Authenticated support inbox')
    expect(html).not.toContain('Authenticated broadcasts console')
  })

  it('opens Broadcasts and Network Safety from safe view parameters', async () => {
    const broadcasts = await ControlCenterMessagesPage({
      searchParams: Promise.resolve({ view: 'broadcasts' }),
    })
    expect(renderToStaticMarkup(broadcasts)).toContain(
      'Authenticated broadcasts console',
    )

    const safety = await ControlCenterMessagesPage({
      searchParams: Promise.resolve({ view: 'safety' }),
    })
    expect(renderToStaticMarkup(safety)).toContain(
      'Authenticated network safety',
    )
  })

  it('passes a support conversation deep link only to Support Inbox', async () => {
    const page = await ControlCenterMessagesPage({
      searchParams: Promise.resolve({
        view: 'support',
        conversationId: '00000000-0000-4000-8000-000000000001',
      }),
    })
    expect(renderToStaticMarkup(page)).toContain(
      'Authenticated support inbox 00000000-0000-4000-8000-000000000001',
    )
  })

  it('shows private direct messages only to the owner', async () => {
    const ownerPage = await ControlCenterMessagesPage({
      searchParams: Promise.resolve({ view: 'direct' }),
    })
    const ownerHtml = renderToStaticMarkup(ownerPage)
    expect(ownerHtml).toContain('Owner private direct messages')
    expect(ownerHtml).toContain('Direct messages')

    getControlCenterAccessMock.mockResolvedValueOnce({
      operator: { email: 'support@example.com' },
      scope: 'site_support',
      method: 'control_center_session',
    })
    const supportPage = await ControlCenterMessagesPage({
      searchParams: Promise.resolve({ view: 'direct' }),
    })
    const supportHtml = renderToStaticMarkup(supportPage)
    expect(supportHtml).toContain('Authenticated support inbox')
    expect(supportHtml).not.toContain('Owner private direct messages')
    expect(supportHtml).not.toContain('Direct messages')

    getControlCenterAccessMock.mockResolvedValueOnce({
      operator: { email: 'owner@example.com' },
      scope: 'owner',
      method: 'loc_service',
    })
    const agentPage = await ControlCenterMessagesPage({
      searchParams: Promise.resolve({ view: 'direct' }),
    })
    const agentHtml = renderToStaticMarkup(agentPage)
    expect(agentHtml).toContain('Authenticated support inbox')
    expect(agentHtml).not.toContain('Owner private direct messages')
  })

  it('preserves the destination when redirecting an unauthenticated visitor', async () => {
    getControlCenterAccessMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    await expect(ControlCenterMessagesPage({})).rejects.toThrow(
      'redirect:/control-center/login?redirect=%2Fcontrol-center%2Fmessages',
    )
  })

  it('does not expose the console to a non-operator', async () => {
    getControlCenterAccessMock.mockRejectedValueOnce(
      new MockOperatorAuthError('not operator'),
    )

    const page = await ControlCenterMessagesPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Operator access required')
    expect(html).not.toContain('Authenticated support inbox')
  })
})
