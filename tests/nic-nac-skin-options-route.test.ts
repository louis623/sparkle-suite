import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedNicNacContext: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: mocks.getAuthenticatedNicNacContext,
}))

import { GET } from '@/app/api/nic-nac/skin-options/route'

describe('customer-site skin options route', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['brittany-rep', 'black_diamond'],
    ['lindsey-rep', 'alpine_opal'],
  ])('requests the catalog for %s rather than the support operator', async (repId, privateSkin) => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ skin_id: 'halloween_pumpkin_witch' }, { skin_id: privateSkin }],
      error: null,
    })
    mocks.getAuthenticatedNicNacContext.mockResolvedValue({
      repId,
      supabase: { rpc },
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      skinIds: ['halloween_pumpkin_witch', privateSkin],
    })
    expect(rpc).toHaveBeenCalledWith('list_available_amethyst_skin_ids', {
      p_rep_id: repId,
    })
  })
})
