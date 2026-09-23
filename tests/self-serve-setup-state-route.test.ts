import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createAdminClientMock,
  getAuthenticatedRepMock,
  ensureLiveQueueSyncCodeForRepMock,
  getLiveQueueSyncCodeForRepMock,
  getRequiredSetupStateMock,
  getOperatorSupportRequestContextMock,
} = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  getAuthenticatedRepMock: vi.fn(),
  ensureLiveQueueSyncCodeForRepMock: vi.fn(),
  getLiveQueueSyncCodeForRepMock: vi.fn(),
  getRequiredSetupStateMock: vi.fn(),
  getOperatorSupportRequestContextMock: vi.fn(),
}))

vi.mock('@/lib/operator-support/request-context', () => ({
  getOperatorSupportRequestContext: () => getOperatorSupportRequestContextMock(),
}))

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

  it('returns setup state for authenticated reps', async () => {
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

    const response = await GET(new Request('https://www.yoursparklesuite.com/api/self-serve/setup-state'))

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

  it('opens a preview workspace by conversation id without an auth cookie', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { AuthError } = await import('@/lib/supabase/auth')
    getAuthenticatedRepMock.mockRejectedValue(new AuthError('Not authenticated'))
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { rep_id: 'rep-gracie-smoke' },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const admin = { from }
    createAdminClientMock.mockReturnValue(admin)
    getRequiredSetupStateMock.mockResolvedValue({
      id: 'setup-gracie-smoke',
      repId: 'rep-gracie-smoke',
      status: 'dashboard_unlocked',
      currentStep: 'final_preview_approval',
      completedSteps: ['account_basics'],
      supportState: {
        reviewer_smoke: {
          enabled: true,
          state: 'dashboard_unlocked',
        },
      },
    })
    getLiveQueueSyncCodeForRepMock.mockResolvedValue('GS2-2335')
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(
      new Request(
        'https://preview.test/api/self-serve/setup-state?conversationId=45764110-0330-4a5d-964b-5b5ff49fb662',
      ),
    )

    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledWith('nic_nac_conversations')
    expect(eq).toHaveBeenCalledWith(
      'id',
      '45764110-0330-4a5d-964b-5b5ff49fb662',
    )
    expect(getRequiredSetupStateMock).toHaveBeenCalledWith('rep-gracie-smoke')
    await expect(response.json()).resolves.toEqual({
      state: {
        id: 'setup-gracie-smoke',
        repId: 'rep-gracie-smoke',
        status: 'dashboard_unlocked',
        currentStep: 'final_preview_approval',
        completedSteps: ['account_basics'],
        supportState: {
          reviewer_smoke: {
            enabled: true,
            state: 'dashboard_unlocked',
          },
          review_workspace: {
            enabled: true,
            source: 'conversation_id',
          },
        },
        liveQueueSyncCode: 'GS2-2335',
      },
    })
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

  it('returns 500 when setup state cannot be loaded', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getAuthenticatedRepMock.mockResolvedValue({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
    })
    getRequiredSetupStateMock.mockRejectedValue(new Error('database unavailable'))
    const { GET } = await import('@/app/api/self-serve/setup-state/route')

    const response = await GET(new Request('https://www.yoursparklesuite.com/api/self-serve/setup-state'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to load setup state',
    })
    consoleErrorSpy.mockRestore()
  })
})
