import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { readAvailability } = vi.hoisted(() => ({ readAvailability: vi.fn() }))
vi.mock('@/lib/sparkle-suite/founder-availability-service', () => ({ getFounderAvailability: readAvailability }))
import { GET } from '@/app/api/public/founder-availability/route'
import { LIVE_FOUNDER_AVAILABILITY_URL } from '@/lib/sparkle-suite/live-founder-availability'

const live = { status: 'available', remaining: 18, checkedAt: '2026-10-03T21:40:20.623Z' }
const livePublic = { status: 'available', checkedAt: '2026-10-03T21:40:20.623Z' }
const fetchMock = vi.fn()

describe('anonymous founder availability route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  it.each(['available', 'full'] as const)('returns only the status without caching for %s', async status => {
    const body = { status, remaining: status === 'full' ? 0 : 19, checkedAt: '2026-09-05T16:00:00.000Z' }
    readAvailability.mockResolvedValue(body)
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const json = await response.json()
    expect(json).toEqual({ status, checkedAt: body.checkedAt })
    expect(json).not.toHaveProperty('remaining')
    expect(JSON.stringify(json)).not.toMatch(/remaining|taken|claimed|\b19\b/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('returns a generic unavailable contract, not an invented number', async () => {
    readAvailability.mockResolvedValue({ status: 'unavailable', remaining: null, checkedAt: null })
    const response = await GET()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'unavailable', checkedAt: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('on Suite Smoke returns the live status (never the count) and does not read the Smoke database', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    fetchMock.mockResolvedValue({ ok: true, json: async () => live })
    const response = await GET()
    expect(readAvailability).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(LIVE_FOUNDER_AVAILABILITY_URL, { cache: 'no-store', signal: expect.any(AbortSignal) })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(livePublic)
  })
  it('on Suite Smoke stays unconfirmed when live cannot be read, instead of using the Smoke count', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    fetchMock.mockRejectedValue(new Error('offline'))
    const response = await GET()
    expect(readAvailability).not.toHaveBeenCalled()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'unavailable', checkedAt: null })
  })
  it.each([
    { SPARKLE_ENVIRONMENT: 'smoke', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production' },
    { SPARKLE_ENVIRONMENT: 'production', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke' },
  ])('keeps the local count unless both Smoke markers are set: %j', async env => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', env.SPARKLE_ENVIRONMENT)
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT)
    readAvailability.mockResolvedValue(live)
    const response = await GET()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await response.json()).toEqual(livePublic)
  })
})
