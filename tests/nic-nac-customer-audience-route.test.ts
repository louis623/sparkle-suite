import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const getCustomerAudienceMock = vi.fn()
const unsubscribeCustomerAudienceMemberMock = vi.fn()
const createCustomerAudienceContactMock = vi.fn()
const updateCustomerAudienceContactMock = vi.fn()
const importCustomerAudienceContactsMock = vi.fn()
const formatCustomerAudienceCsvMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
  getPaidNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
}))

vi.mock('@/lib/services/customer-audience', () => ({
  getCustomerAudience: (...args: unknown[]) => getCustomerAudienceMock(...args),
  unsubscribeCustomerAudienceMember: (...args: unknown[]) =>
    unsubscribeCustomerAudienceMemberMock(...args),
  createCustomerAudienceContact: (...args: unknown[]) =>
    createCustomerAudienceContactMock(...args),
  updateCustomerAudienceContact: (...args: unknown[]) =>
    updateCustomerAudienceContactMock(...args),
  importCustomerAudienceContacts: (...args: unknown[]) =>
    importCustomerAudienceContactsMock(...args),
  formatCustomerAudienceCsv: (...args: unknown[]) =>
    formatCustomerAudienceCsvMock(...args),
}))

import { GET, PATCH, POST } from '@/app/api/nic-nac/customer-audience/route'
import { AuthError } from '@/lib/nic-nac/auth'

describe('GET /api/nic-nac/customer-audience', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    getCustomerAudienceMock.mockReset()
    unsubscribeCustomerAudienceMemberMock.mockReset()
    createCustomerAudienceContactMock.mockReset()
    updateCustomerAudienceContactMock.mockReset()
    importCustomerAudienceContactsMock.mockReset()
    formatCustomerAudienceCsvMock.mockReset()
  })

  it('returns the authenticated rep audience summary', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    getCustomerAudienceMock.mockResolvedValueOnce({
      summary: {
        totalCustomers: 2,
        smsReachableCount: 1,
        emailReachableCount: 2,
        marketingConsentCount: 1,
        smsOptedOutCount: 0,
        emailOptedOutCount: 0,
        addedLast30DaysCount: 2,
      },
      customers: [
        {
          id: 'aud-1',
          name: 'Jamie Lane',
          phone: '+15555550101',
          email: 'jamie@example.com',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
          canReceiveSms: true,
          canReceiveEmail: true,
          consentDate: '2026-05-05T12:00:00Z',
          createdAt: '2026-05-05T12:00:00Z',
          smsOptedOutAt: null,
          emailOptedOutAt: null,
          stopKeywordReceivedAt: null,
        },
      ],
    })

    const response = await GET(
      new Request('http://localhost/api/nic-nac/customer-audience?limit=5&channel=sms'),
    )

    expect(getCustomerAudienceMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        channelFilter: 'sms',
        query: undefined,
        liveActivity: undefined,
        liveActivitySince: null,
        limit: 5,
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      summary: {
        totalCustomers: 2,
        smsReachableCount: 1,
        emailReachableCount: 2,
        marketingConsentCount: 1,
        smsOptedOutCount: 0,
        emailOptedOutCount: 0,
        addedLast30DaysCount: 2,
      },
      customers: [
        {
          id: 'aud-1',
          name: 'Jamie Lane',
          phone: '+15555550101',
          email: 'jamie@example.com',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
          canReceiveSms: true,
          canReceiveEmail: true,
          consentDate: '2026-05-05T12:00:00Z',
          createdAt: '2026-05-05T12:00:00Z',
          smsOptedOutAt: null,
          emailOptedOutAt: null,
          stopKeywordReceivedAt: null,
        },
      ],
    })
  })

  it('returns 401 when the rep is not signed in', async () => {
    getAuthenticatedNicNacContextMock.mockRejectedValueOnce(
      new AuthError('Not authenticated'),
    )

    const response = await GET(
      new Request('http://localhost/api/nic-nac/customer-audience'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    })
  })

  it('lets the authenticated rep unsubscribe one audience row by id', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    unsubscribeCustomerAudienceMemberMock.mockResolvedValueOnce({
      updatedCount: 1,
      smsUpdatedCount: 1,
      emailUpdatedCount: 0,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audienceId: 'aud-1',
          unsubscribeSms: true,
          unsubscribeEmail: false,
        }),
      }),
    )

    expect(unsubscribeCustomerAudienceMemberMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        audienceId: 'aud-1',
        unsubscribeSms: true,
        unsubscribeEmail: false,
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: {
        updatedCount: 1,
        smsUpdatedCount: 1,
        emailUpdatedCount: 0,
      },
    })
  })

  it('downloads the complete authenticated rep customer list as a CSV', async () => {
    const customers = [{
      id: 'aud-1',
      name: 'Jamie Lane',
      phone: '+15555550101',
      email: 'jamie@example.com',
      smsConsent: true,
      emailConsent: true,
      marketingConsent: false,
      canReceiveSms: true,
      canReceiveEmail: true,
      consentDate: null,
      createdAt: '2026-08-16T12:00:00Z',
      smsOptedOutAt: null,
      emailOptedOutAt: null,
      stopKeywordReceivedAt: null,
    }]
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      supabase: { marker: 'supabase' },
    })
    getCustomerAudienceMock.mockResolvedValueOnce({ summary: {}, customers })
    formatCustomerAudienceCsvMock.mockReturnValueOnce('Name\r\n"Jamie Lane"')

    const response = await GET(
      new Request('http://localhost/api/nic-nac/customer-audience?format=csv'),
    )

    expect(getCustomerAudienceMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      {
        channelFilter: undefined,
        query: undefined,
        liveActivity: undefined,
        liveActivitySince: null,
        limit: null,
      },
    )
    expect(formatCustomerAudienceCsvMock).toHaveBeenCalledWith(customers)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain('attachment;')
    await expect(response.text()).resolves.toBe('Name\r\n"Jamie Lane"')
  })

  it('creates a manual contact without accepting consent fields', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      supabase: { marker: 'supabase' },
    })
    createCustomerAudienceContactMock.mockResolvedValueOnce({
      id: 'aud-new',
      name: 'Taylor Brooks',
      smsConsent: false,
      emailConsent: false,
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Taylor Brooks',
          favoriteGemOrStone: 'opal',
          smsConsent: true,
          emailConsent: true,
        }),
      }),
    )

    expect(createCustomerAudienceContactMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      expect.objectContaining({
        name: 'Taylor Brooks',
        favoriteGemOrStone: 'opal',
      }),
      { actorKind: 'rep', actorRepId: 'rep-1' },
    )
    expect(createCustomerAudienceContactMock.mock.calls[0][2]).not.toHaveProperty(
      'smsConsent',
    )
    expect(response.status).toBe(201)
  })

  it('imports contact profiles without accepting spreadsheet consent fields', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      supabase: { marker: 'supabase' },
    })
    importCustomerAudienceContactsMock.mockResolvedValueOnce({
      createdCount: 1,
      updatedCount: 0,
      skipped: [],
    })

    const response = await POST(
      new Request('http://localhost/api/nic-nac/customer-audience', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          contacts: [{
            name: 'Taylor Brooks',
            email: 'taylor@example.com',
            favoriteCollection: 'Simply Studs',
            smsConsent: true,
            emailConsent: true,
          }],
        }),
      }),
    )

    expect(importCustomerAudienceContactsMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      [{
        name: 'Taylor Brooks',
        email: 'taylor@example.com',
        favoriteCollection: 'Simply Studs',
      }],
      { actorKind: 'rep', actorRepId: 'rep-1' },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: { createdCount: 1, updatedCount: 0, skipped: [] },
    })
  })

  it('patches only profile fields submitted by the authenticated rep', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      supabase: { marker: 'supabase' },
    })
    updateCustomerAudienceContactMock.mockResolvedValueOnce({
      id: 'aud-1',
      name: 'Jamie Lane',
      favoriteMaterial: 'silver',
    })

    const response = await PATCH(
      new Request('http://localhost/api/nic-nac/customer-audience', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audienceId: 'aud-1',
          favoriteMaterial: 'silver',
          smsConsent: true,
        }),
      }),
    )

    expect(updateCustomerAudienceContactMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
      { audienceId: 'aud-1', favoriteMaterial: 'silver' },
      { actorKind: 'rep', actorRepId: 'rep-1' },
    )
    expect(response.status).toBe(200)
  })
  it('passes LIVE order tile filters through and rejects unknown values', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    getCustomerAudienceMock.mockResolvedValueOnce({ summary: {}, customers: [] })
    const ok = await GET(
      new Request('http://localhost/api/nic-nac/customer-audience?liveActivity=gone_quiet&since=2026-07-15T00:00:00Z&query=Jane'),
    )
    expect(ok.status).toBe(200)
    expect(getCustomerAudienceMock).toHaveBeenLastCalledWith(
      { marker: 'supabase' },
      'rep-1',
      expect.objectContaining({
        query: 'Jane',
        liveActivity: 'gone_quiet',
        liveActivitySince: '2026-07-15T00:00:00Z',
      }),
    )
    const calls = getCustomerAudienceMock.mock.calls.length
    const bad = await GET(
      new Request('http://localhost/api/nic-nac/customer-audience?liveActivity=everyone'),
    )
    expect(bad.status).toBe(400)
    expect(getCustomerAudienceMock.mock.calls.length).toBe(calls)
  })
})
