import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedOperatorMock = vi.fn()
const connectPrelaunchLaunchBuildToProductionRepMock = vi.fn()
const preparePrelaunchClientAccountForLaunchBuildMock = vi.fn()

const { MockAuthError, MockOperatorAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {},
  MockOperatorAuthError: class MockOperatorAuthError extends Error {},
}))

vi.mock('@/lib/supabase/operator-auth', () => ({
  AuthError: MockAuthError,
  OperatorAuthError: MockOperatorAuthError,
  getAuthenticatedOperator: (...args: unknown[]) =>
    getAuthenticatedOperatorMock(...args),
}))

vi.mock('@/lib/prelaunch/production-roster', () => ({
  connectPrelaunchLaunchBuildToProductionRep: (...args: unknown[]) =>
    connectPrelaunchLaunchBuildToProductionRepMock(...args),
}))

vi.mock('@/lib/prelaunch/client-account', () => ({
  preparePrelaunchClientAccountForLaunchBuild: (...args: unknown[]) =>
    preparePrelaunchClientAccountForLaunchBuildMock(...args),
}))

import { POST } from '@/app/api/control-center/intake/production-roster/route'

describe('POST /api/control-center/intake/production-roster', () => {
  beforeEach(() => {
    getAuthenticatedOperatorMock.mockReset()
    connectPrelaunchLaunchBuildToProductionRepMock.mockReset()
    preparePrelaunchClientAccountForLaunchBuildMock.mockReset()
  })

  it('connects an existing rep to the launch build without creating accounts', async () => {
    getAuthenticatedOperatorMock.mockResolvedValueOnce({
      repId: 'operator-1',
      rep: { email: 'louis@neonrabbit.net' },
    })
    connectPrelaunchLaunchBuildToProductionRepMock.mockResolvedValueOnce({
      id: 'build-1',
      repId: 'rep-1',
      status: 'ready',
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/intake/production-roster', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          launchBuildId: 'build-1',
          repId: 'rep-1',
          notes: 'Demo account confirmed.',
        }),
      }),
    )

    expect(connectPrelaunchLaunchBuildToProductionRepMock).toHaveBeenCalledWith({
      launchBuildId: 'build-1',
      repId: 'rep-1',
      notes: 'Demo account confirmed.',
      operatorRepId: 'operator-1',
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      build: {
        id: 'build-1',
        repId: 'rep-1',
        status: 'ready',
      },
    })
  })

  it('does not create an account when no existing rep id is provided', async () => {
    getAuthenticatedOperatorMock.mockResolvedValueOnce({
      repId: 'operator-1',
      rep: { email: 'louis@neonrabbit.net' },
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/intake/production-roster', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          launchBuildId: 'build-1',
          createClientAccount: true,
          notes: 'Customer account prepared.',
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'repId is required. Create a payment link before an account exists.',
    })
    expect(preparePrelaunchClientAccountForLaunchBuildMock).not.toHaveBeenCalled()
    expect(connectPrelaunchLaunchBuildToProductionRepMock).not.toHaveBeenCalled()
  })

  it('redirects form saves back to the client roster panel', async () => {
    getAuthenticatedOperatorMock.mockResolvedValueOnce({
      repId: 'operator-1',
      rep: { email: 'louis@neonrabbit.net' },
    })
    connectPrelaunchLaunchBuildToProductionRepMock.mockResolvedValueOnce({
      id: 'build-1',
    })

    const form = new FormData()
    form.set('launchBuildId', 'build-1')
    form.set('repId', 'rep-1')
    form.set('notes', 'Demo account confirmed.')
    form.set('returnTo', '/control-center/intake#reps')

    const response = await POST(
      new Request('http://localhost/api/control-center/intake/production-roster', {
        method: 'POST',
        body: form,
      }),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'http://localhost/control-center/intake#reps',
    )
  })

  it('rejects missing rep id before writing', async () => {
    getAuthenticatedOperatorMock.mockResolvedValueOnce({
      repId: 'operator-1',
      rep: { email: 'louis@neonrabbit.net' },
    })

    const response = await POST(
      new Request('http://localhost/api/control-center/intake/production-roster', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ launchBuildId: 'build-1' }),
      }),
    )

    expect(connectPrelaunchLaunchBuildToProductionRepMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
  })

  it('returns 401 for unauthenticated requests without writing', async () => {
    getAuthenticatedOperatorMock.mockRejectedValueOnce(
      new MockAuthError('missing session'),
    )

    const response = await POST(
      new Request('http://localhost/api/control-center/intake/production-roster', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          launchBuildId: 'build-1',
          repId: 'rep-1',
        }),
      }),
    )

    expect(connectPrelaunchLaunchBuildToProductionRepMock).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
  })
})
