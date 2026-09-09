import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const cookiesMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

import { getAuthenticatedNicNacContext } from '@/lib/nic-nac/auth'
import { runWithOperatorSupportRequestContext } from '@/lib/operator-support/request-context'
import { getAuthenticatedRep } from '@/lib/supabase/auth'

const targetRep = {
  id: 'rep-kim',
  auth_user_id: 'auth-kim',
  email: 'kim@example.com',
  display_name: 'Kim',
  business_name: 'Kim Sparkles',
  stripe_customer_id: null,
  public_site_slug: 'kim-sparkles',
  custom_domain: null,
  time_zone: 'America/New_York',
  status: 'active',
}

const supportContext = {
  actor: {
    mode: 'operator_support' as const,
    operatorRepId: 'operator-1',
    operatorEmail: 'louis@example.com',
    operatorDisplayName: 'Louis',
    subjectRepId: targetRep.id,
    supportSessionId: 'session-1',
    capabilities: ['workspace.view' as const],
  },
  session: {} as never,
  supabase: { marker: 'support-admin' } as never,
  targetRep,
}

describe('operator support authenticated target context', () => {
  it('hydrates the frozen target without consulting rep cookies', async () => {
    const authenticated = await runWithOperatorSupportRequestContext(
      supportContext,
      () => getAuthenticatedRep(),
    )

    expect(authenticated).toEqual({ repId: 'rep-kim', rep: targetRep })
    expect(cookiesMock).not.toHaveBeenCalled()
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('reuses the verified admin client for target-scoped Workspace services', async () => {
    const authenticated = await runWithOperatorSupportRequestContext(
      supportContext,
      () => getAuthenticatedNicNacContext(),
    )

    expect(authenticated).toMatchObject({
      repId: 'rep-kim',
      rep: targetRep,
      supabase: { marker: 'support-admin' },
    })
    expect(cookiesMock).not.toHaveBeenCalled()
  })
})
