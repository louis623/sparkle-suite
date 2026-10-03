import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))

import { connection } from 'next/server'
import {
  LIVE_FOUNDER_AVAILABILITY_URL,
  isSuiteSmokeEnvironment,
  parseLiveFounderAvailability,
  readLandingFounderAvailability,
  readLiveFounderAvailability,
} from '@/lib/sparkle-suite/live-founder-availability'

const checkedAt = '2026-10-03T21:40:20.623Z'
const unavailable = { status: 'unavailable', remaining: null, checkedAt: null }

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('live founder availability', () => {
  it('accepts a counted live payload and rejects anything that is not a real slot count', () => {
    expect(parseLiveFounderAvailability({ status: 'available', remaining: 18, checkedAt })).toEqual({ status: 'available', remaining: 18, checkedAt })
    expect(parseLiveFounderAvailability({ status: 'available', remaining: 7, checkedAt })).toEqual({ status: 'available', remaining: 7, checkedAt })
    expect(parseLiveFounderAvailability({ status: 'available', remaining: 20, checkedAt })).toEqual({ status: 'available', remaining: 20, checkedAt })
    expect(parseLiveFounderAvailability({ status: 'full', remaining: 0, checkedAt })).toEqual({ status: 'full', remaining: 0, checkedAt })
    for (const payload of [
      { status: 'available', remaining: 0, checkedAt },
      { status: 'available', remaining: 21, checkedAt },
      { status: 'available', remaining: '18', checkedAt },
      { status: 'unavailable', remaining: 18, checkedAt },
      { status: 'full', remaining: 18, checkedAt },
      null,
    ]) {
      expect(parseLiveFounderAvailability(payload)).toBeNull()
    }
  })

  it('reads the live endpoint without storing the response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'available', remaining: 18, checkedAt }) }))
    await expect(readLiveFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toEqual({ status: 'available', remaining: 18, checkedAt })
    expect(fetchImpl).toHaveBeenCalledWith(LIVE_FOUNDER_AVAILABILITY_URL, { cache: 'no-store', signal: expect.any(AbortSignal) })
  })

  it('returns unconfirmed when live is down or the body is not a count', async () => {
    const offline = vi.fn(async () => { throw new Error('offline') })
    const invalid = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'available', remaining: 99, checkedAt }) }))
    const denied = vi.fn(async () => ({ ok: false, json: async () => ({ status: 'available', remaining: 18, checkedAt }) }))
    await expect(readLiveFounderAvailability(offline as unknown as typeof fetch)).resolves.toEqual(unavailable)
    await expect(readLiveFounderAvailability(invalid as unknown as typeof fetch)).resolves.toEqual(unavailable)
    await expect(readLiveFounderAvailability(denied as unknown as typeof fetch)).resolves.toEqual(unavailable)
  })

  it('skips the live read unless this process is Suite Smoke', async () => {
    const fetchImpl = vi.fn()
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'production')
    expect(isSuiteSmokeEnvironment()).toBe(false)
    await expect(readLandingFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toBeUndefined()
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(connection).not.toHaveBeenCalled()

    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ status: 'available', remaining: 18, checkedAt }) })
    await expect(readLandingFounderAvailability(fetchImpl as unknown as typeof fetch)).resolves.toEqual({ status: 'available', remaining: 18, checkedAt })
    expect(connection).toHaveBeenCalledOnce()
  })
})
