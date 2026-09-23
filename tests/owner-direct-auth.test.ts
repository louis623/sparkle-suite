import { beforeEach, describe, expect, it, vi } from 'vitest'

const getControlCenterAccessMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/operator-auth', () => ({
  getControlCenterAccess: getControlCenterAccessMock,
  OperatorAuthError: class OperatorAuthError extends Error {},
  requireControlCenterOwner: (access: { scope: string }) => {
    if (access.scope !== 'owner') throw new Error('owner required')
    return access
  },
}))

import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'

describe('owner direct authorization boundary', () => {
  beforeEach(() => getControlCenterAccessMock.mockReset())

  it('allows Louis’s interactive owner session', async () => {
    getControlCenterAccessMock.mockResolvedValue({ scope: 'owner', method: 'control_center_session' })
    await expect(requireOwnerDirectAccess()).resolves.toMatchObject({ scope: 'owner' })
  })

  it('rejects narrow operators and service contexts, including LOC agents with owner scope', async () => {
    getControlCenterAccessMock.mockResolvedValueOnce({ scope: 'site_support', method: 'control_center_session' })
    await expect(requireOwnerDirectAccess()).rejects.toThrow('owner required')
    getControlCenterAccessMock.mockResolvedValueOnce({ scope: 'owner', method: 'loc_service' })
    await expect(requireOwnerDirectAccess()).rejects.toThrow('interactive owner session')
  })

  it('requires exact same-origin browser writes', () => {
    const request = (origin?: string, fetchSite?: string) => new Request('https://www.yoursparklesuite.com/api/control-center/direct-messages', {
      method: 'POST',
      headers: {
        ...(origin ? { origin } : {}),
        ...(fetchSite ? { 'sec-fetch-site': fetchSite } : {}),
      },
    })
    expect(() => requireOwnerDirectSameOrigin(request('https://www.yoursparklesuite.com', 'same-origin'))).not.toThrow()
    expect(() => requireOwnerDirectSameOrigin(request())).toThrow('same-origin')
    expect(() => requireOwnerDirectSameOrigin(request('https://attacker.example', 'cross-site'))).toThrow('same-origin')
    expect(() => requireOwnerDirectSameOrigin(request('https://attacker.example'))).toThrow('same-origin')
  })
})
