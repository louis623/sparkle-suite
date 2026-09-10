import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const getControlCenterAccessMock = vi.fn()
const createAdminClientMock = vi.fn()
const listOperatorCustomerProfilesMock = vi.fn()
const previewWorkspaceMessageAudienceMock = vi.fn()
const listWorkspaceMessagePublicationsMock = vi.fn()
const createWorkspaceMessageDraftMock = vi.fn()
const publishWorkspaceMessageMock = vi.fn()

const { MockAuthError, MockOperatorAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {},
  MockOperatorAuthError: class MockOperatorAuthError extends Error {},
}))

vi.mock('@/lib/supabase/operator-auth', () => ({
  AuthError: MockAuthError,
  OperatorAuthError: MockOperatorAuthError,
  getControlCenterAccess: (...args: unknown[]) =>
    getControlCenterAccessMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/services/client-account-profiles', () => ({
  listOperatorCustomerProfiles: (...args: unknown[]) =>
    listOperatorCustomerProfilesMock(...args),
}))

vi.mock('@/lib/services/workspace-message-audience', () => ({
  previewWorkspaceMessageAudience: (...args: unknown[]) =>
    previewWorkspaceMessageAudienceMock(...args),
}))

vi.mock('@/lib/services/workspace-messages', () => ({
  createWorkspaceMessageDraft: (...args: unknown[]) =>
    createWorkspaceMessageDraftMock(...args),
  listWorkspaceMessagePublications: (...args: unknown[]) =>
    listWorkspaceMessagePublicationsMock(...args),
  publishWorkspaceMessage: (...args: unknown[]) =>
    publishWorkspaceMessageMock(...args),
}))

import { GET, POST } from '@/app/api/control-center/messages/route'

const admin = { from: vi.fn() }

const baseMessage = {
  title: 'New workspace guide',
  summary: 'A short overview of the change.',
  body: 'Open the new guide to see what changed and how to use it.',
  category: 'help_update',
  priority: 'important',
  actionUrl: '/nic-nac?section=tools',
  audience: { kind: 'all_active' },
}

function previewMembers() {
  return {
    rule: { kind: 'all_active' },
    count: 2,
    members: [
      { repId: 'rep-1', displayName: 'Avery', businessName: 'Avery Sparkles' },
      { repId: 'rep-2', displayName: 'Blair', businessName: 'Blair Bling' },
    ],
  }
}

describe('/api/control-center/messages', () => {
  beforeEach(() => {
    getControlCenterAccessMock.mockReset()
    createAdminClientMock.mockReset()
    listOperatorCustomerProfilesMock.mockReset()
    previewWorkspaceMessageAudienceMock.mockReset()
    listWorkspaceMessagePublicationsMock.mockReset()
    createWorkspaceMessageDraftMock.mockReset()
    publishWorkspaceMessageMock.mockReset()

    getControlCenterAccessMock.mockResolvedValue({
      operator: { email: 'owner@example.com' },
    })
    createAdminClientMock.mockReturnValue(admin)
    previewWorkspaceMessageAudienceMock.mockResolvedValue(previewMembers())
    listOperatorCustomerProfilesMock.mockResolvedValue([])
    listWorkspaceMessagePublicationsMock.mockResolvedValue([])
  })

  it('lists active recipient choices and publication delivery metrics', async () => {
    listOperatorCustomerProfilesMock.mockResolvedValueOnce([
      {
        repId: 'rep-active',
        primaryContactName: 'Active Rep',
        clientName: 'Active Business',
        showName: 'Active Show',
        email: 'active@example.com',
        accountStatus: 'active',
      },
      {
        repId: 'rep-inactive',
        primaryContactName: 'Inactive Rep',
        clientName: 'Inactive Business',
        showName: 'Inactive Show',
        email: 'inactive@example.com',
        accountStatus: 'cancelled',
      },
    ])
    listWorkspaceMessagePublicationsMock.mockResolvedValueOnce([
      {
        id: 'publication-1',
        title: 'August update',
        summary: 'This month in Sparkle Suite',
        category: 'business_update',
        priority: 'normal',
        status: 'published',
        deliveryCount: 12,
        readCount: 8,
        publishedAt: '2026-08-17T20:00:00.000Z',
        senderDisplayName: 'Sparkle Suite',
      },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(getControlCenterAccessMock).toHaveBeenCalledOnce()
    expect(listOperatorCustomerProfilesMock).toHaveBeenCalledWith(admin, {
      limit: 500,
    })
    expect(listWorkspaceMessagePublicationsMock).toHaveBeenCalledWith(admin, {
      limit: 50,
    })
    await expect(response.json()).resolves.toEqual({
      ok: true,
      recipients: [
        {
          id: 'rep-active',
          name: 'Active Rep',
          showName: 'Active Show',
          email: 'active@example.com',
        },
      ],
      publications: [
        {
          id: 'publication-1',
          title: 'August update',
          summary: 'This month in Sparkle Suite',
          category: 'business_update',
          priority: 'normal',
          status: 'published',
          recipientCount: 12,
          deliveredCount: 12,
          readCount: 8,
          publishedAt: '2026-08-17T20:00:00.000Z',
          senderLabel: 'Sparkle Suite',
          senderKey: null,
          body: '',
          actionUrl: null,
          audienceKind: 'all_active',
          audienceRepIds: [],
          sourceType: null,
          sourceId: null,
        },
      ],
    })
  })

  it('previews a frozen audience without creating or publishing a message', async () => {
    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'preview', ...baseMessage }),
      }),
    )

    expect(response.status).toBe(200)
    expect(previewWorkspaceMessageAudienceMock).toHaveBeenCalledWith(admin, {
      kind: 'all_active',
    })
    expect(createWorkspaceMessageDraftMock).not.toHaveBeenCalled()
    expect(publishWorkspaceMessageMock).not.toHaveBeenCalled()
    const result = await response.json()
    expect(result.preview).toMatchObject({
      recipientCount: 2,
      recipientSample: [
        { id: 'rep-1', name: 'Avery', showName: 'Avery Sparkles' },
        { id: 'rep-2', name: 'Blair', showName: 'Blair Bling' },
      ],
    })
    expect(result.preview.audienceToken).toMatch(/^[a-f0-9]{64}$/)
  })

  it('saves a draft without delivering it', async () => {
    createWorkspaceMessageDraftMock.mockResolvedValueOnce({
      id: 'draft-1',
      status: 'draft',
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'save_draft', ...baseMessage }),
      }),
    )

    expect(response.status).toBe(201)
    expect(createWorkspaceMessageDraftMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        senderKey: 'owner',
        title: 'New workspace guide',
        body: [
          {
            type: 'paragraph',
            text: 'Open the new guide to see what changed and how to use it.',
          },
        ],
        actionLabel: 'Open update',
        actionUrl: '/nic-nac?section=tools',
        audience: { kind: 'all_active' },
      }),
    )
    expect(publishWorkspaceMessageMock).not.toHaveBeenCalled()
  })

  it('allows the audited Nic-Nac sender identity, but no arbitrary sender key', async () => {
    createWorkspaceMessageDraftMock.mockResolvedValueOnce({
      id: 'draft-nic-nac',
      status: 'draft',
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'save_draft',
          senderKey: 'nic_nac',
          ...baseMessage,
        }),
      }),
    )

    expect(response.status).toBe(201)
    expect(createWorkspaceMessageDraftMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ senderKey: 'nic_nac' }),
    )

    const invalidResponse = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'save_draft',
          senderKey: 'untrusted_sender',
          ...baseMessage,
        }),
      }),
    )

    expect(invalidResponse.status).toBe(400)
    expect(createWorkspaceMessageDraftMock).toHaveBeenCalledOnce()
  })

  it('updates a loaded draft instead of creating an unrelated publication', async () => {
    createWorkspaceMessageDraftMock.mockResolvedValueOnce({
      id: 'draft-existing',
      status: 'draft',
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'save_draft',
          publicationId: 'draft-existing',
          ...baseMessage,
        }),
      }),
    )

    expect(response.status).toBe(201)
    expect(createWorkspaceMessageDraftMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ publicationId: 'draft-existing' }),
    )
    expect(publishWorkspaceMessageMock).not.toHaveBeenCalled()
  })

  it('requires an explicit confirmation before a multi-rep publication', async () => {
    const previewResponse = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'preview', ...baseMessage }),
      }),
    )
    const preview = (await previewResponse.json()).preview

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'publish',
          ...baseMessage,
          audienceToken: preview.audienceToken,
          expectedRecipientCount: 2,
          confirmed: false,
        }),
      }),
    )

    expect(response.status).toBe(409)
    expect(publishWorkspaceMessageMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'WORKSPACE_MESSAGE_CONFIRMATION_REQUIRED',
    })
  })

  it('publishes a confirmed message against the exact previewed audience', async () => {
    const previewResponse = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'preview', ...baseMessage }),
      }),
    )
    const preview = (await previewResponse.json()).preview
    publishWorkspaceMessageMock.mockResolvedValueOnce({
      id: 'publication-1',
      status: 'published',
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'publish',
          ...baseMessage,
          audienceToken: preview.audienceToken,
          expectedRecipientCount: 2,
          confirmed: true,
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(publishWorkspaceMessageMock).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        senderKey: 'owner',
        expectedRecipientCount: 2,
        expectedRecipientIds: ['rep-1', 'rep-2'],
        audience: { kind: 'all_active' },
      }),
    )
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      recipientCount: 2,
    })
  })

  it('rejects a changed audience after preview', async () => {
    const previewResponse = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'preview', ...baseMessage }),
      }),
    )
    const preview = (await previewResponse.json()).preview
    previewWorkspaceMessageAudienceMock.mockResolvedValueOnce({
      rule: { kind: 'all_active' },
      count: 2,
      members: [
        { repId: 'rep-1', displayName: 'Avery', businessName: 'Avery Sparkles' },
        { repId: 'rep-3', displayName: 'Casey', businessName: 'Casey Gems' },
      ],
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'publish',
          ...baseMessage,
          audienceToken: preview.audienceToken,
          expectedRecipientCount: 2,
          confirmed: true,
        }),
      }),
    )

    expect(response.status).toBe(409)
    expect(publishWorkspaceMessageMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'WORKSPACE_MESSAGE_AUDIENCE_CHANGED',
    })
  })

  it('rejects executable content and unsafe links before resolving an audience', async () => {
    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'preview',
          ...baseMessage,
          body: '<script>alert(1)</script>',
          actionUrl: 'javascript:alert(1)',
        }),
      }),
    )

    expect(response.status).toBe(422)
    expect(previewWorkspaceMessageAudienceMock).not.toHaveBeenCalled()
    expect(publishWorkspaceMessageMock).not.toHaveBeenCalled()
  })

  it('returns 401 before creating an admin client for an unauthenticated request', async () => {
    getControlCenterAccessMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    const response = await GET()

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' })
  })

  it('returns 403 for an authenticated non-operator', async () => {
    getControlCenterAccessMock.mockRejectedValueOnce(
      new MockOperatorAuthError('not operator'),
    )

    const response = await POST(
      new Request('http://localhost/api/control-center/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'preview', ...baseMessage }),
      }),
    )

    expect(response.status).toBe(403)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
