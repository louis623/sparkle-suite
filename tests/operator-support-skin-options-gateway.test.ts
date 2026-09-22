import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadContext: vi.fn(),
  appendAudit: vi.fn(),
  skinOptionsGet: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/operator-support/http', () => ({
  loadVerifiedOperatorSupportContext: mocks.loadContext,
}))
vi.mock('@/lib/operator-support/audit', () => ({
  OperatorSupportAuditUnavailableError: class OperatorSupportAuditUnavailableError extends Error {},
  appendOperatorSupportAuditEvent: mocks.appendAudit,
}))
vi.mock('@/app/api/nic-nac/skin-options/route', () => ({
  GET: mocks.skinOptionsGet,
}))

import { GET } from '@/app/api/control-center/support-sessions/[sessionId]/gateway/route'

describe('operator support customer-site skin options gateway', () => {
  it('passes the fixed target’s read-only theme request to the skin-options route', async () => {
    const sessionId = '11111111-1111-4111-8111-111111111111'
    mocks.loadContext.mockResolvedValue({
      actor: { mode: 'operator_support' },
      session: {
        id: sessionId,
        operatorRepId: 'operator-rep',
        targetRepId: 'lindsey-rep',
      },
      targetRep: { id: 'lindsey-rep' },
      supabase: {},
    })
    mocks.appendAudit.mockResolvedValue(undefined)
    mocks.skinOptionsGet.mockResolvedValue(
      Response.json({ skinIds: ['halloween_pumpkin_witch', 'alpine_opal'] }),
    )

    const request = new Request(
      `https://www.yoursparklesuite.com/api/control-center/support-sessions/${sessionId}/gateway?path=%2Fapi%2Fnic-nac%2Fskin-options`,
      { headers: { 'x-sparkle-support-csrf': 'test-csrf' } },
    )
    const response = await GET(request, { params: Promise.resolve({ sessionId }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      skinIds: ['halloween_pumpkin_witch', 'alpine_opal'],
    })
    expect(mocks.loadContext).toHaveBeenCalledWith(sessionId, expect.objectContaining({
      capability: 'site.view',
      mutation: false,
    }))
    expect(mocks.skinOptionsGet).toHaveBeenCalledOnce()
  })
})
