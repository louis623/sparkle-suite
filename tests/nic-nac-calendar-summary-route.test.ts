import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const listMyShowsMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getAuthenticatedNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
  getPaidNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
}))

vi.mock('@/lib/services/calendar', () => ({
  listMyShows: (...args: unknown[]) => listMyShowsMock(...args),
}))

import { GET } from '@/app/api/nic-nac/calendar-summary/route'
import { AuthError } from '@/lib/nic-nac/auth'

describe('GET /api/nic-nac/calendar-summary', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    listMyShowsMock.mockReset()
  })

  it('returns upcoming and recent shows for the authenticated rep', async () => {
    getAuthenticatedNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-1',
      rep: { id: 'rep-1' },
      supabase: { marker: 'supabase' },
    })
    listMyShowsMock
      .mockResolvedValueOnce({
        events: [{ id: 'show-1', title: 'Thursday reveal' }],
        totalCount: 1,
      })
      .mockResolvedValueOnce({
        events: [{ id: 'show-2', title: 'Launch party' }],
        totalCount: 1,
      })

    const response = await GET(
      new Request(
        'http://localhost/api/nic-nac/calendar-summary?upcoming=180&history=60',
      ),
    )

    expect(listMyShowsMock).toHaveBeenNthCalledWith(
      1,
      { marker: 'supabase' },
      'rep-1',
      {
        upcoming: true,
        limit: 180,
      },
    )
    expect(listMyShowsMock).toHaveBeenNthCalledWith(
      2,
      { marker: 'supabase' },
      'rep-1',
      {
        upcoming: false,
        pastOnly: true,
        limit: 60,
        status: ['completed', 'cancelled'],
      },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      upcomingEvents: [{ id: 'show-1', title: 'Thursday reveal' }],
      recentEvents: [{ id: 'show-2', title: 'Launch party' }],
    })
  })

  it('returns 400 for an invalid upcoming limit', async () => {
    const response = await GET(
      new Request('http://localhost/api/nic-nac/calendar-summary?upcoming=nope'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'upcoming must be a whole number between 1 and 180.',
    })
  })

  it('returns 400 for an invalid history limit', async () => {
    const response = await GET(
      new Request('http://localhost/api/nic-nac/calendar-summary?history=nope'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'history must be a whole number between 1 and 180.',
    })
  })

  it.each([
    ['upcoming', '8abc'],
    ['upcoming', '1.5'],
    ['upcoming', '0'],
    ['upcoming', '-1'],
    ['upcoming', '181'],
    ['history', '4abc'],
    ['history', '2.5'],
    ['history', '0'],
    ['history', '-1'],
    ['history', '181'],
  ])('returns 400 when %s has invalid limit %s', async (key, value) => {
    const response = await GET(
      new Request(`http://localhost/api/nic-nac/calendar-summary?${key}=${value}`),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: `${key} must be a whole number between 1 and 180.`,
    })
    expect(listMyShowsMock).not.toHaveBeenCalled()
  })

  it('returns 401 when the rep is not signed in', async () => {
    getAuthenticatedNicNacContextMock.mockRejectedValueOnce(
      new AuthError('Not authenticated'),
    )

    const response = await GET(
      new Request('http://localhost/api/nic-nac/calendar-summary'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'unauthenticated',
    })
  })
})
