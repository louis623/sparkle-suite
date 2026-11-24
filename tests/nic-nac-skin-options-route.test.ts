import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedNicNacContext: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: mocks.getAuthenticatedNicNacContext,
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'reps') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }
      return {
        select: async () => ({
          data: [
            { skin_id: 'black_diamond', visibility: 'private', owner_rep_id: 'brittany-rep', allow_internal_demo: true },
            { skin_id: 'alpine_opal', visibility: 'private', owner_rep_id: 'lindsey-rep', allow_internal_demo: true },
          ],
          error: null,
        }),
      }
    },
  }),
}))

import { GET } from '@/app/api/nic-nac/skin-options/route'

describe('customer-site skin options route', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['brittany-rep', 'black_diamond'],
    ['lindsey-rep', 'alpine_opal'],
  ])('requests the catalog for %s rather than the support operator', async (repId, privateSkin) => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ skin_id: 'halloween_pumpkin_witch' }, { skin_id: privateSkin }, { skin_id: 'midnight_rose' }, { skin_id: 'fall_owl_harvest_moon' }, { skin_id: 'gobble_and_fizz' }, { skin_id: 'pie_please' }, { skin_id: 'pearl_rose' }, { skin_id: 'rose_champagne' }],
      error: null,
    })
    mocks.getAuthenticatedNicNacContext.mockResolvedValue({
      repId,
      supabase: { rpc },
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      skinIds: ['gobble_and_fizz', 'pie_please', privateSkin, 'halloween_pumpkin_witch', 'midnight_rose', 'fall_owl_harvest_moon', 'pearl_rose', 'rose_champagne'],
      ownedPrivateSkinIds: [privateSkin],
    })
    expect(rpc).toHaveBeenCalledWith('list_available_amethyst_skin_ids', {
      p_rep_id: repId,
    })
  })
})
