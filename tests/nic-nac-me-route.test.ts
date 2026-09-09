import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const getLiveQueueSyncCodeForRepMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
}))

vi.mock('@/lib/services/live-queue', () => ({
  getLiveQueueSyncCodeForRep: (...args: unknown[]) =>
    getLiveQueueSyncCodeForRepMock(...args),
}))

import { GET } from '@/app/api/nic-nac/me/route'

describe('/api/nic-nac/me', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    getLiveQueueSyncCodeForRepMock.mockReset()
  })

  it('returns the authenticated rep profile with the saved Secret Rep ID Number alias', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: {
        id: 'rep-1',
        email: 'rep@example.com',
        display_name: 'Mile High Fizz',
        business_name: 'Fizz With Lindsey',
        public_site_slug: 'milehighfizz',
        custom_domain: 'milehighfizz.com',
        time_zone: 'America/Denver',
      },
      supabase: { marker: 'supabase' },
    })
    getLiveQueueSyncCodeForRepMock.mockResolvedValueOnce('MHF-7342')

    const response = await GET()

    expect(getLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-1',
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      rep: {
        id: 'rep-1',
        email: 'rep@example.com',
        display_name: 'Mile High Fizz',
        business_name: 'Fizz With Lindsey',
        public_site_slug: 'milehighfizz',
        custom_domain: 'milehighfizz.com',
        time_zone: 'America/Denver',
        live_queue_sync_code: 'MHF-7342',
        secret_rep_id_number: 'MHF-7342',
      },
    })
  })
})
