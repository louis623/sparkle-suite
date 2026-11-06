import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createAdminClientMock,
  getAuthenticatedRepMock,
  ensureLiveQueueSyncCodeForRepMock,
  getLiveQueueSyncCodeForRepMock,
  getRequiredSetupStateMock,
  getOperatorSupportRequestContextMock,
  cookiesMock,
  createServerClientMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  getAuthenticatedRepMock: vi.fn(),
  ensureLiveQueueSyncCodeForRepMock: vi.fn(),
  getLiveQueueSyncCodeForRepMock: vi.fn(),
  getRequiredSetupStateMock: vi.fn(),
  getOperatorSupportRequestContextMock: vi.fn(),
  cookiesMock: vi.fn(),
  createServerClientMock: vi.fn(),
}))

vi.mock('@/lib/operator-support/request-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/operator-support/request-context')>()
  return { ...actual, getOperatorSupportRequestContext: () =>
    getOperatorSupportRequestContextMock() ?? actual.getOperatorSupportRequestContext() }
})
vi.mock('next/headers', () => ({ cookies: () => cookiesMock() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: (...args: unknown[]) => createServerClientMock(...args) }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/supabase/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedRep: (...args: unknown[]) => getAuthenticatedRepMock(...args),
}))

vi.mock('@/lib/services/live-queue', () => ({
  ensureLiveQueueSyncCodeForRep: (...args: unknown[]) =>
    ensureLiveQueueSyncCodeForRepMock(...args),
  getLiveQueueSyncCodeForRep: (...args: unknown[]) =>
    getLiveQueueSyncCodeForRepMock(...args),
}))

vi.mock('@/lib/self-serve/required-setup', () => ({
  getRequiredSetupState: (...args: unknown[]) => getRequiredSetupStateMock(...args),
}))

describe('/api/self-serve/setup-state', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    createAdminClientMock.mockReset()
    getAuthenticatedRepMock.mockReset()
    ensureLiveQueueSyncCodeForRepMock.mockReset()
    getLiveQueueSyncCodeForRepMock.mockReset()
    getRequiredSetupStateMock.mockReset()
    getOperatorSupportRequestContextMock.mockReset()
    getOperatorSupportRequestContextMock.mockReturnValue(null)
  })

  it('[identity] ordinary rep remains owner despite another conversation in the URL', async () => {
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    getRequiredSetupStateMock.mockResolvedValue({
      status: 'required_setup',
      currentStep: 'account_basics',
      completedSteps: [],
    })
    createAdminClientMock.mockReturnValue({ from: vi.fn() })
    getLiveQueueSyncCodeForRepMock.mockResolvedValue('MHF-7342')
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(new Request('https://www.yoursparklesuite.com/api/self-serve/setup-state?conversationId=another-reps-conversation'))

    expect(response.headers.get('cache-control')).toContain('private, no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
    expect(getRequiredSetupStateMock).toHaveBeenCalledWith('rep-1')
    expect(getLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(
      expect.any(Object),
      'rep-1',
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      state: {
        status: 'required_setup',
        currentStep: 'account_basics',
        completedSteps: [],
        liveQueueSyncCode: 'MHF-7342',
      },
    })
  })

  it('creates a saved Live Queue sync code when required setup has none yet', async () => {
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    getRequiredSetupStateMock.mockResolvedValue({
      status: 'required_setup',
      currentStep: 'live_queue_setup',
      completedSteps: ['account_basics'],
    })
    const admin = { from: vi.fn() }
    createAdminClientMock.mockReturnValue(admin)
    getLiveQueueSyncCodeForRepMock.mockResolvedValue(null)
    ensureLiveQueueSyncCodeForRepMock.mockResolvedValue({
      syncCode: 'GFF-7342',
      created: true,
    })
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(new Request('https://www.yoursparklesuite.com/api/self-serve/setup-state'))

    expect(getLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(admin, 'rep-1')
    expect(ensureLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(admin, {
      repId: 'rep-1',
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      state: {
        status: 'required_setup',
        currentStep: 'live_queue_setup',
        completedSteps: ['account_basics'],
        liveQueueSyncCode: 'GFF-7342',
      },
    })
  })

  it('shows an existing Live Queue code during authorized support without creating one', async () => {
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'target-rep',
      rep: { id: 'target-rep' },
    })
    getRequiredSetupStateMock.mockResolvedValue({
      status: 'dashboard_unlocked',
      currentStep: 'final_preview_approval',
      completedSteps: ['live_queue_setup'],
    })
    const admin = { from: vi.fn() }
    createAdminClientMock.mockReturnValue(admin)
    getLiveQueueSyncCodeForRepMock.mockResolvedValue('LQX-9321')
    getOperatorSupportRequestContextMock.mockReturnValue({
      actor: {
        mode: 'operator_support',
        capabilities: ['workspace.view', 'live_queue.view'],
      },
    })
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(new Request('https://www.yoursparklesuite.com/api/self-serve/setup-state'))

    expect(getLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(admin, 'target-rep')
    expect(ensureLiveQueueSyncCodeForRepMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      state: { liveQueueSyncCode: 'LQX-9321' },
    })
  })

  it('returns 401 when the rep is not authenticated', async () => {
    const { AuthError } = await import('@/lib/supabase/auth')
    getAuthenticatedRepMock.mockRejectedValue(new AuthError('Not authenticated'))
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(
      new Request('http://localhost/api/self-serve/setup-state'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Not authenticated',
    })
    expect(getRequiredSetupStateMock).not.toHaveBeenCalled()
  })

  it('[identity] denies unauthenticated preview conversation lookups without reading another rep', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    const { AuthError } = await import('@/lib/supabase/auth')
    getAuthenticatedRepMock.mockRejectedValue(new AuthError('Not authenticated'))
    const { GET } = await import('@/app/api/self-serve/setup-state/route')
    const response = await GET(new Request('https://smoke.test/api/self-serve/setup-state?conversationId=other-rep'))
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(getRequiredSetupStateMock).not.toHaveBeenCalled()
    expect(ensureLiveQueueSyncCodeForRepMock).not.toHaveBeenCalled()
  })

  it('does not open unauthenticated workspace review URLs in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')
    const { AuthError } = await import('@/lib/supabase/auth')
    getAuthenticatedRepMock.mockRejectedValue(new AuthError('Not authenticated'))
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(
      new Request(
        'https://www.yoursparklesuite.com/api/self-serve/setup-state?conversationId=45764110-0330-4a5d-964b-5b5ff49fb662',
      ),
    )

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(getRequiredSetupStateMock).not.toHaveBeenCalled()
  })

  it('[identity] fails safely when authenticated setup resolution fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    getRequiredSetupStateMock.mockRejectedValue(new Error('database unavailable'))
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(new Request('https://www.yoursparklesuite.com/api/self-serve/setup-state'))

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(getRequiredSetupStateMock).toHaveBeenCalledTimes(1)
    expect(ensureLiveQueueSyncCodeForRepMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to load setup state',
    })
    consoleErrorSpy.mockRestore()
  })
  it('[identity] concurrent authorized developer context cannot replace a separate rep session', async () => {
    const { getAuthenticatedRep } = await vi.importActual<typeof import('@/lib/supabase/auth')>('@/lib/supabase/auth')
    const { runWithOperatorSupportRequestContext, getOperatorSupportRequestContext } =
      await import('@/lib/operator-support/request-context')
    const ordinary = { id: 'ordinary-rep', auth_user_id: 'ordinary-user', email: 'ordinary@example.test',
      display_name: 'Ordinary Synthetic', business_name: 'Ordinary Studio', stripe_customer_id: null,
      public_site_slug: null, custom_domain: null, time_zone: 'America/New_York', status: 'active' }
    const target = { ...ordinary, id: 'support-target', auth_user_id: 'target-user', display_name: 'Support Synthetic' }
    const context = { actor: { mode: 'operator_support', subjectRepId: target.id }, targetRep: target } as
      Parameters<typeof runWithOperatorSupportRequestContext>[0]
    cookiesMock.mockResolvedValue({ getAll: () => [] })
    createServerClientMock.mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: ordinary.auth_user_id } }, error: null }) } })
    const eq = vi.fn((_column: string, userId: string) => ({ single: async () => ({ data: userId === ordinary.auth_user_id ? ordinary : null, error: null }) }))
    createAdminClientMock.mockReturnValue({ from: () => ({ select: () => ({ eq }) }) })
    let release!: () => void
    let entered!: () => void
    const waiting = new Promise<void>(resolve => { release = resolve })
    const active = new Promise<void>(resolve => { entered = resolve })
    const support = runWithOperatorSupportRequestContext(context, async () => {
      expect((await getAuthenticatedRep()).repId).toBe(target.id)
      entered()
      await waiting
      expect((await getAuthenticatedRep()).repId).toBe(target.id)
    })
    await active
    try {
      expect(getOperatorSupportRequestContext()).toBeNull()
      expect((await getAuthenticatedRep()).repId).toBe(ordinary.id)
      expect(eq).toHaveBeenCalledWith('auth_user_id', ordinary.auth_user_id)
    } finally { release() }
    await support
    expect(getOperatorSupportRequestContext()).toBeNull()
  })

})
