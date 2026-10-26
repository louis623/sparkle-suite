import { expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { homepagePaintGate } from '@/lib/amethyst/homepage-paint-gate'

function harness() {
  let notify: (list: unknown) => void = () => {}
  const listeners: Record<string, () => void> = {}
  const window = { addEventListener: (name: string, fn: () => void) => { listeners[name] = fn } } as { sparkleAfterHeroPaint: (fn: () => void) => void; addEventListener: (name: string, fn: () => void) => void }
  runInNewContext(homepagePaintGate.replace(/<\/?script>/g, ''), {
    window, document: { hidden: false, readyState: 'loading', querySelector: () => ({}), addEventListener: window.addEventListener },
    PerformanceObserver: class { constructor(fn: typeof notify) { notify = fn } observe() {} disconnect() {} },
    setTimeout, clearTimeout,
  })
  return { window, listeners, paint: (image: boolean) => notify({ getEntries: () => [{ url: image ? '/poster.webp' : '', element: { tagName: 'H2', closest: () => ({}) } }] }) }
}

it('does not let header/text paint launch enhancements before the hero image paints', () => {
  vi.useFakeTimers()
  try {
    const h = harness(), enhance = vi.fn()
    h.window.sparkleAfterHeroPaint(enhance)
    h.paint(false); vi.advanceTimersByTime(0); expect(enhance).not.toHaveBeenCalled()
    h.paint(true); vi.advanceTimersByTime(0); expect(enhance).toHaveBeenCalledTimes(1)
    h.paint(true); vi.advanceTimersByTime(0); expect(enhance).toHaveBeenCalledTimes(1)
  } finally { vi.useRealTimers() }
})

it.each(['pointerdown', 'keydown', 'pagehide', 'deadline'])('unblocks enhancements on %s even if the image fails', event => {
  vi.useFakeTimers()
  try {
    const h = harness(), enhance = vi.fn()
    h.window.sparkleAfterHeroPaint(enhance)
    if (event === 'deadline') { h.listeners.DOMContentLoaded(); vi.advanceTimersByTime(1501) } else { h.listeners[event](); vi.advanceTimersByTime(0) }
    expect(enhance).toHaveBeenCalledTimes(1)
  } finally { vi.useRealTimers() }
})
