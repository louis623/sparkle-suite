import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedRepMock = vi.fn()

vi.mock('@/lib/supabase/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/supabase/auth')>()
  return {
    ...original,
    getAuthenticatedRep: (...args: unknown[]) =>
      getAuthenticatedRepMock(...args),
  }
})

import { POST } from '@/app/api/account/activate-trial/route'
import { AuthError } from '@/lib/supabase/auth'

describe('POST /api/account/activate-trial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('acknowledges an active account without opening free access', async () => {
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1', status: 'active' },
    })

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      activated: false,
    })
  })

  it('rejects an incomplete rep record that was never provisioned', async () => {
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-orphaned',
      rep: { id: 'rep-orphaned', status: 'onboarding' },
    })

    const response = await POST()

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'account_not_found',
      message: 'No Sparkle Suite account is associated with this email.',
    })
  })

  it('rejects unauthenticated requests', async () => {
    getAuthenticatedRepMock.mockRejectedValue(new AuthError('no session'))

    const response = await POST()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    })
  })
})
