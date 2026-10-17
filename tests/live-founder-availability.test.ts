import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))
vi.mock('@/lib/sparkle-suite/founder-availability-service', () => ({ getFounderAvailability: vi.fn() }))

import { connection } from 'next/server'
import { getFounderAvailability } from '@/lib/sparkle-suite/founder-availability-service'
import {
  LIVE_FOUNDER_AVAILABILITY_URL,
  isSuiteSmokeEnvironment,
  parseLiveFounderAvailability,
  readLandingFounderAvailability,
  readLiveFounderAvailability,
} from '@/lib/sparkle-suite/live-founder-availability'

const checkedAt = '2026-10-03T21:40:20.623Z'
const unavailable = { status: 'unavailable', checkedAt: null }

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('live founder availability', () => {
  it('accepts a status-only live payload, drops any legacy count, and rejects anything else', () => {
    expect(parseLiveFounderAvailability({ status: 'available', checkedAt })).toEqual({ status: 'available', checkedAt })
    expect(parseLiveFounderAvailability({ status: 'full', checkedAt })).toEqual({ status: 'full', checkedAt })
    expect(parseLiveFounderAvailability({ status: 'available', remaining: 18, checkedAt })).toEqual({ status: 'available', checkedAt })
    expect(parseLiveFounderAvailability({ status: 'full', remaining: 0, checkedAt })).toEqual({ status: 'full', checkedAt })
    for (const payload of [
      { status: 'unavailable', checkedAt },
      { status: 'open', checkedAt },
      { status: 'available', checkedAt: 7 },
      { status: 'available', checkedAt: '' },
      null,
    ]) {
      expect(parseLiveFounderAvailability(payload)).toBeNull()
    }
  })

  it('reads the live endpoint without storing the response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'available', remaining: 18, checkedAt }) }))
    await expect(readLiveFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toEqual({ status: 'available', checkedAt })
    expect(fetchImpl).toHaveBeenCalledWith(LIVE_FOUNDER_AVAILABILITY_URL, { cache: 'no-store', signal: expect.any(AbortSignal) })
  })

  it('returns unconfirmed when live is down or the body is not a count', async () => {
    const offline = vi.fn(async () => { throw new Error('offline') })
    const invalid = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'open', checkedAt }) }))
    const denied = vi.fn(async () => ({ ok: false, json: async () => ({ status: 'available', remaining: 18, checkedAt }) }))
    await expect(readLiveFounderAvailability(offline as unknown as typeof fetch)).resolves.toEqual(unavailable)
    await expect(readLiveFounderAvailability(invalid as unknown as typeof fetch)).resolves.toEqual(unavailable)
    await expect(readLiveFounderAvailability(denied as unknown as typeof fetch)).resolves.toEqual(unavailable)
  })

  it('server-reads its own environment aggregate outside Smoke without an HTTP or Stripe request', async () => {
    const fetchImpl = vi.fn()
    vi.mocked(getFounderAvailability).mockResolvedValue({ status: 'available', remaining: 17, checkedAt })
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'production')
    expect(isSuiteSmokeEnvironment()).toBe(false)
    await expect(readLandingFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toEqual({ status: 'available', checkedAt })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(getFounderAvailability).toHaveBeenCalledOnce()
    expect(connection).toHaveBeenCalledOnce()
  })

  it('server-reads only the public Live aggregate on Smoke, without accessing Smoke allocation rows', async () => {
    const fetchImpl = vi.fn()
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ status: 'available', remaining: 18, checkedAt }) })
    await expect(readLandingFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toEqual({ status: 'available', checkedAt })
    expect(connection).toHaveBeenCalledOnce()
    expect(getFounderAvailability).not.toHaveBeenCalled()
    expect(fetchImpl).toHaveBeenCalledWith(LIVE_FOUNDER_AVAILABILITY_URL, { cache: 'no-store', signal: expect.any(AbortSignal) })
  })

  it('passes through unconfirmed own-environment data for the founder-price fallback', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'production')
    vi.mocked(getFounderAvailability).mockResolvedValue({ status: 'unavailable', remaining: null, checkedAt: null })
    const fetchImpl = vi.fn()
    await expect(readLandingFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toEqual(unavailable)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
