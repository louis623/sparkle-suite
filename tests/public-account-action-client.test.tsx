import { Children, isValidElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effect: undefined as undefined | (() => void | (() => void)) }))
const auth = vi.hoisted(() => ({ createClient: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn(), signOut: vi.fn() }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = initial
    return [hooks.values[index], (next: unknown) => { hooks.values[index] = next }]
  },
  useEffect: (effect: () => void | (() => void)) => { hooks.effect = effect },
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: auth.createClient }))

import { SparkleSuitePublicAccountAction } from '@/app/_components/SparkleSuitePublicAccountAction'

let frame: (() => void) | undefined
let idle: (() => void) | undefined
let onAuthChange: ((_event: string, session: unknown) => void) | undefined
let cleanup: void | (() => void)
let browser: {
  requestAnimationFrame: ReturnType<typeof vi.fn>
  cancelAnimationFrame: ReturnType<typeof vi.fn>
  requestIdleCallback?: ReturnType<typeof vi.fn>
  cancelIdleCallback: ReturnType<typeof vi.fn>
  setTimeout: typeof setTimeout
  clearTimeout: typeof clearTimeout
  location: { assign: ReturnType<typeof vi.fn> }
}

function render() {
  hooks.cursor = 0
  return SparkleSuitePublicAccountAction()
}
async function settle() {
  await vi.dynamicImportSettled()
  await Promise.resolve()
}
function start() {
  const element = render()
  cleanup = hooks.effect?.()
  return element
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  hooks.values = []
  hooks.cursor = 0
  hooks.effect = undefined
  frame = idle = undefined
  cleanup = undefined
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.invalid')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-public-key')
  browser = {
    requestAnimationFrame: vi.fn(callback => { frame = callback; return 1 }),
    cancelAnimationFrame: vi.fn(),
    requestIdleCallback: vi.fn(callback => { idle = callback; return 2 }),
    cancelIdleCallback: vi.fn(),
    setTimeout, clearTimeout,
    location: { assign: vi.fn() },
  }
  vi.stubGlobal('window', browser)
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.signOut.mockResolvedValue({ error: null })
  auth.onAuthStateChange.mockImplementation(callback => {
    onAuthChange = callback
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } }
  })
  auth.createClient.mockReturnValue({ auth })
})
afterEach(() => {
  cleanup?.()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('marketing account SDK deferral', () => {
  it('keeps sign-in immediately usable and initializes only after the paint/idle boundary', async () => {
    const element = start()
    expect(element.props).toMatchObject({ href: '/login', prefetch: false })
    expect(auth.createClient).not.toHaveBeenCalled()
    frame?.()
    expect(browser.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })
    expect(auth.createClient).not.toHaveBeenCalled()
    idle?.()
    await settle()
    expect(auth.createClient).toHaveBeenCalledOnce()
    expect(auth.getSession).toHaveBeenCalledOnce()
    expect(hooks.values[0]).toBe('signed_out')
  })

  it('cancels scheduled work and prevents late import callbacks from creating a client after unmount', async () => {
    start()
    frame?.()
    idle?.()
    cleanup?.()
    cleanup = undefined
    await settle()
    expect(browser.cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(browser.cancelIdleCallback).toHaveBeenCalledWith(2)
    expect(auth.createClient).not.toHaveBeenCalled()
  })

  it('preserves auth updates, unsubscribes and ignores late events after unmount', async () => {
    start()
    frame?.()
    idle?.()
    await settle()
    onAuthChange?.('SIGNED_IN', { user: { id: 'synthetic' } })
    expect(hooks.values[0]).toBe('signed_in')
    cleanup?.()
    cleanup = undefined
    expect(auth.unsubscribe).toHaveBeenCalledOnce()
    onAuthChange?.('SIGNED_OUT', null)
    expect(hooks.values[0]).toBe('signed_in')
  })

  it('uses the timer fallback when idle callbacks are unavailable', async () => {
    delete browser.requestIdleCallback
    start()
    frame?.()
    expect(auth.createClient).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    await settle()
    expect(auth.createClient).toHaveBeenCalledOnce()
  })

  it('leaves the ordinary sign-in link usable if session lookup fails or local env is absent', async () => {
    auth.getSession.mockRejectedValue(new Error('unavailable'))
    start()
    frame?.()
    idle?.()
    await settle()
    expect(hooks.values[0]).toBe('signed_out')
    cleanup?.()
    cleanup = undefined
    auth.createClient.mockClear()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    hooks.values = []
    const element = start()
    expect(element.props).toMatchObject({ href: '/login', prefetch: false })
    expect(auth.createClient).not.toHaveBeenCalled()
  })

  it('still signs out through the SDK and returns home', async () => {
    hooks.values = ['signed_in', false]
    const element = render()
    const children = Children.toArray(element.props.children as ReactNode)
    const button = children.find(child => isValidElement(child) && child.type === 'button')
    expect(isValidElement<{ onClick: () => void }>(button)).toBe(true)
    if (!isValidElement<{ onClick: () => void }>(button)) throw new Error('Logout button missing')
    button.props.onClick()
    await settle()
    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(browser.location.assign).toHaveBeenCalledWith('/')
  })
})
