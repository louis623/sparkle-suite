import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('leaves the server hero untouched until hydration finishes, then observes it normally', () => {
  let notify!: () => void
  const querySelectorAll = vi.fn(() => [])
  const context = {
    SPARKLE_FIRST_PAINT: {} as object | null,
    document: {
      readyState: 'complete', documentElement: {},
      addEventListener() {},
      body: { classList: { contains: () => true } }, querySelectorAll,
    },
    MutationObserver: class {
      constructor(callback: () => void) { notify = callback }
      observe() {}
    },
  }
  runInNewContext(readFileSync('public/amethyst/halloween-pumpkin-witch.js', 'utf8'), context)
  notify()
  expect(querySelectorAll).not.toHaveBeenCalled()
  context.SPARKLE_FIRST_PAINT = null
  notify()
  expect(querySelectorAll).toHaveBeenCalledWith(expect.stringContaining('.hp-hero'))
})
