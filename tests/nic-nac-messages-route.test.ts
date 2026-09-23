import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPaidNicNacContextMock = vi.fn()
const listRepWorkspaceMessagesMock = vi.fn()
const listRepWorkspaceInboxMock = vi.fn()
const updateRepWorkspaceMessageDeliveryMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) => getPaidNicNacContextMock(...args),
  getAuthenticatedNicNacContext: (...args: unknown[]) => getPaidNicNacContextMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ marker: 'admin-supabase' }),
}))

vi.mock('@/lib/services/workspace-inbox', () => ({
  listRepWorkspaceInbox: (...args: unknown[]) => listRepWorkspaceInboxMock(...args),
}))

vi.mock('@/lib/services/workspace-messages', () => ({
  listRepWorkspaceMessages: (...args: unknown[]) =>
    listRepWorkspaceMessagesMock(...args),
  updateRepWorkspaceMessageDelivery: (...args: unknown[]) =>
    updateRepWorkspaceMessageDeliveryMock(...args),
}))

import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/nic-nac/messages/route'

describe('receive-only rep Message Center route', () => {
  beforeEach(() => {
    getPaidNicNacContextMock.mockReset()
    listRepWorkspaceMessagesMock.mockReset()
    listRepWorkspaceInboxMock.mockReset()
    updateRepWorkspaceMessageDeliveryMock.mockReset()
  })

  it('lists only the authenticated rep deliveries with filters and pagination', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      supabase: { marker: 'authed-supabase' },
    })
    listRepWorkspaceInboxMock.mockResolvedValueOnce({
      unreadCount: 1,
      nextCursor: 'next',
      messages: [{ id: 'delivery-1', deliveryId: 'delivery-1' }],
    })

    const response = await GET(
      new Request(
        'http://localhost/api/nic-nac/messages?limit=10&category=announcement&unread=true&archived=false&cursor=c1',
      ),
    )

    expect(listRepWorkspaceInboxMock).toHaveBeenCalledWith(
      { marker: 'admin-supabase' },
      'rep-1',
      {
        limit: 10,
        cursor: 'c1',
        category: 'announcement',
        unreadOnly: true,
        archived: false,
        view: 'all',
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      unreadCount: 1,
      nextCursor: 'next',
    })
  })

  it('passes bounded person/subject search and Needs reply view through the authenticated inbox service', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({ repId: 'rep-1' })
    listRepWorkspaceInboxMock.mockResolvedValueOnce({ unreadCount: 0, messages: [], nextCursor: null })
    const response = await GET(new Request(
      'http://localhost/api/nic-nac/messages?view=needs_reply&search=Taylor&limit=50',
    ))
    expect(response.status).toBe(200)
    expect(listRepWorkspaceInboxMock).toHaveBeenCalledWith(
      { marker: 'admin-supabase' }, 'rep-1',
      expect.objectContaining({ view: 'needs_reply', search: 'Taylor', limit: 50 }),
    )
  })

  it.each([
    'limit=0',
    'limit=101',
    'limit=2.5',
    'category=support_request',
    'unread=yes',
    'archived=1',
    'search=a',
    `search=${'x'.repeat(81)}`,
  ])('rejects invalid list query %s before authentication', async (query) => {
    const response = await GET(
      new Request(`http://localhost/api/nic-nac/messages?${query}`),
    )
    expect(response.status).toBe(400)
    expect(getPaidNicNacContextMock).not.toHaveBeenCalled()
  })

  it('updates only read/archive state on the authenticated rep delivery', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      supabase: { marker: 'authed-supabase' },
    })
    updateRepWorkspaceMessageDeliveryMock.mockResolvedValueOnce({
      deliveryId: 'delivery-1',
      isRead: true,
      isArchived: true,
    })

    const response = await PATCH(
      new Request('http://localhost/api/nic-nac/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deliveryId: 'delivery-1',
          read: true,
          archived: true,
        }),
      }),
    )

    expect(updateRepWorkspaceMessageDeliveryMock).toHaveBeenCalledWith(
      { marker: 'authed-supabase' },
      'rep-1',
      { deliveryId: 'delivery-1', read: true, archived: true },
    )
    expect(response.status).toBe(200)
  })

  it.each([
    {},
    { deliveryId: 'delivery-1' },
    { deliveryId: 'delivery-1', read: 'true' },
    { deliveryId: 'delivery-1', archived: 1 },
    { deliveryId: '', read: true },
    { deliveryId: 'delivery-1', action: 'reply', body: 'hello' },
  ])('rejects invalid or compose-like patch payload %#', async (body) => {
    const response = await PATCH(
      new Request('http://localhost/api/nic-nac/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    expect(response.status).toBe(400)
    expect(getPaidNicNacContextMock).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON without authenticating', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/nic-nac/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }),
    )
    expect(response.status).toBe(400)
    expect(getPaidNicNacContextMock).not.toHaveBeenCalled()
  })

  it.each([
    ['POST', POST],
    ['PUT', PUT],
    ['DELETE', DELETE],
  ] as const)('returns 405 for rep %s attempts', async (_method, handler) => {
    const response = await handler()
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, PATCH')
    await expect(response.json()).resolves.toMatchObject({
      code: 'REP_MESSAGE_CENTER_RECEIVE_ONLY',
    })
    expect(getPaidNicNacContextMock).not.toHaveBeenCalled()
  })
})
