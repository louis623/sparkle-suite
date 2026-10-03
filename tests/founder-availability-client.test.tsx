import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({
  setAvailability: vi.fn(), effect: null as null | (() => void | (() => void)),
}))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [initial, hooks.setAvailability],
  useEffect: (effect: () => void | (() => void)) => { hooks.effect = effect },
}))
import { FounderAvailabilityProvider } from '@/app/_components/landing-interactions'

const unavailable = { status: 'unavailable', remaining: null, checkedAt: null }
const snapshot = { status: 'available', remaining: 19, checkedAt: '2026-09-05T15:47:10.792Z' }
let cleanup: void | (() => void)
let visibilityListener: (() => void) | undefined
let hidden = false
const fetchMock = vi.fn()

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function start() {
  FounderAvailabilityProvider({ children: null })
  cleanup = hooks.effect?.()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  hidden = false
  cleanup = undefined
  visibilityListener = undefined
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval })
  vi.stubGlobal('document', {
    get hidden() { return hidden },
    addEventListener: vi.fn((_name, listener) => { visibilityListener = listener }),
    removeEventListener: vi.fn(),
  })
  fetchMock.mockResolvedValue({ ok: true, json: async () => snapshot })
})
afterEach(() => {
  cleanup?.()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('founder availability client refresh policy (hook boundary)', () => {
  it('only reads the anonymous no-store endpoint; does not start checkout or reserve a slot', async () => {
    start()
    await settle()
    expect(fetchMock).toHaveBeenCalledWith('/api/public/founder-availability', { cache: 'no-store', signal: expect.any(AbortSignal) })
    expect(hooks.setAvailability).toHaveBeenLastCalledWith(snapshot)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    { status: 'available', remaining: 1, checkedAt: snapshot.checkedAt },
    { status: 'full', remaining: 0, checkedAt: snapshot.checkedAt },
  ])('accepts the last-slot and sold-out contracts: $status', async body => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => body })
    start()
    await settle()
    expect(hooks.setAvailability).toHaveBeenLastCalledWith(body)
  })

  it.each([
    { status: 'available', remaining: 0 },
    { status: 'available', remaining: 21 },
    { status: 'available', remaining: 1.5 },
    { status: 'available', remaining: '19' },
    { status: 'full', remaining: 19 },
    { status: 'unavailable', remaining: 19 },
  ])('suppresses invalid scarcity payloads: %j', async body => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => body })
    start()
    await settle()
    expect(hooks.setAvailability).toHaveBeenLastCalledWith(unavailable)
  })

  it('removes a previously known count when refresh fails, rather than keeping stale scarcity', async () => {
    start()
    await settle()
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(hooks.setAvailability).toHaveBeenLastCalledWith(unavailable)
  })

  it('keeps the Smoke page on the last live count when a refresh cannot be reached', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    start()
    await settle()
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(hooks.setAvailability).toHaveBeenLastCalledWith(snapshot)
    expect(hooks.setAvailability).not.toHaveBeenCalledWith(unavailable)
  })

  it('suppresses even a plausible count on a non-success response', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => snapshot })
    start()
    await settle()
    expect(hooks.setAvailability).toHaveBeenLastCalledWith(unavailable)
  })

  it('refreshes when visible again, avoids background reads, and cleans up', async () => {
    hidden = true
    start()
    await settle()
    expect(fetchMock).not.toHaveBeenCalled()
    hidden = false
    visibilityListener?.()
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal
    cleanup?.()
    cleanup = undefined
    expect(signal.aborted).toBe(true)
    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', visibilityListener)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
