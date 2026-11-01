import { afterEach, expect, it, vi } from 'vitest'
const effects = vi.hoisted(() => [] as Array<() => void | (() => void)>)
vi.mock('react', () => ({ useEffect: (effect: () => void | (() => void)) => effects.push(effect) }))
import ClientErrorReporter, { reportClientError } from '@/components/client-error-reporter'
import { clientErrorSource } from '@/lib/monitoring/client-error-source'
afterEach(() => { effects.length = 0; vi.unstubAllEnvs(); vi.unstubAllGlobals() })
const source = 'https://own.example/_next/static/chunks/abcdef123.js'
it('reports own-script errors privately and cleans up listeners; ignores extension/foreign first frames', async () => {
  vi.stubEnv('CLIENT_ERROR_ALERTS', 'on')
  const listeners = new Map<string, (event: unknown) => void>()
  const removeEventListener = vi.fn(), sendBeacon = vi.fn(() => true)
  vi.stubGlobal('window', { location: { origin: 'https://own.example', pathname: '/rep/private@example.test/join' }, addEventListener: (name, listener) => listeners.set(name, listener), removeEventListener })
  vi.stubGlobal('navigator', { userAgent: 'Firefox/120.9', sendBeacon })
  expect(ClientErrorReporter()).toBeNull(); const cleanup = effects[0]()
  const error = new TypeError('Cannot read properties of null private@example.test')
  error.stack = 'TypeError\n    at privateName (' + source + ':1:22)'
  await reportClientError(error)
  listeners.get('error')?.({ error, filename: source, lineno: 1, colno: 22 })
  await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledTimes(2))
  const data = JSON.parse(await sendBeacon.mock.calls[0][1].text())
  expect(data.messageHash).toMatch(/^[a-f0-9]{64}$/); expect(data.source).toEqual({ url: source, line: 1, column: 22 })
  expect(JSON.stringify(data)).not.toMatch(/private@example|privateName/)
  const extension = new Error('private'); extension.stack = 'Error\n at chrome-extension://abc/injected.js:1:1\n at ' + source + ':1:1'
  await reportClientError(extension)
  await reportClientError(error, 'https://third.example/script.js', 1, 1)
  expect(sendBeacon).toHaveBeenCalledTimes(2)
  expect(clientErrorSource(extension.stack)).toEqual({ url: 'chrome-extension://abc/injected.js', line: 1, column: 1 })
  if (typeof cleanup === 'function') cleanup(); expect(removeEventListener).toHaveBeenCalledTimes(2)
})
it('is off by default, drops unverifiable sources and contains transport failures', async () => {
  vi.stubEnv('CLIENT_ERROR_ALERTS', '')
  await expect(reportClientError(new Error('private'))).resolves.toBeUndefined()
  ClientErrorReporter(); expect(effects[0]()).toBeUndefined()
  vi.stubEnv('CLIENT_ERROR_ALERTS', 'on')
  await expect(reportClientError('unlocated rejection')).resolves.toBeUndefined()
})
