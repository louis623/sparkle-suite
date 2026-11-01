import { afterEach, expect, it, vi } from 'vitest'

const effects = vi.hoisted(() => [] as Array<() => void | (() => void)>)
vi.mock('react', () => ({ useEffect: (effect: () => void | (() => void)) => effects.push(effect) }))
import ClientErrorReporter, { reportClientError } from '@/components/client-error-reporter'

afterEach(() => { effects.length = 0; vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('mounts non-invasive listeners once and removes them on unmount', async () => {
  vi.stubEnv('CLIENT_ERROR_ALERTS', 'on')
  const listeners = new Map<string, (event: unknown) => void>()
  const addEventListener = vi.fn((name, listener) => listeners.set(name, listener))
  const removeEventListener = vi.fn()
  const sendBeacon = vi.fn(() => true)
  vi.stubGlobal('window', { location: { pathname: '/rep/private@example.test/join' }, addEventListener, removeEventListener })
  vi.stubGlobal('navigator', { userAgent: 'Firefox/120.9 private@example.test', sendBeacon })
  expect(ClientErrorReporter()).toBeNull()
  const cleanup = effects[0]()
  expect(addEventListener.mock.calls.map(call => call[0])).toEqual(['error', 'unhandledrejection'])
  listeners.get('error')?.({ error: new TypeError('Cannot read properties of null private@example.test') })
  listeners.get('unhandledrejection')?.({ reason: 'Customer Mary Smith' })
  expect(sendBeacon).toHaveBeenCalledTimes(2)
  for (const call of sendBeacon.mock.calls) {
    expect(call[0]).toBe('/api/public/client-error')
    expect(await call[1].text()).not.toMatch(/private@example|Mary Smith/)
    expect(call[1].size).toBeLessThanOrEqual(4096)
  }
  if (typeof cleanup === 'function') cleanup()
  expect(removeEventListener).toHaveBeenCalledTimes(2)
})

it('does nothing when off and contains beacon failures when on', () => {
  vi.stubEnv('CLIENT_ERROR_ALERTS', '')
  reportClientError(new Error('private'))
  ClientErrorReporter()
  expect(effects[0]()).toBeUndefined()
  vi.stubEnv('CLIENT_ERROR_ALERTS', 'on')
  expect(() => reportClientError(new Error('private'))).not.toThrow()
})
