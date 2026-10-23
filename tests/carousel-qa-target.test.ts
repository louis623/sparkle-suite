import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const { options } = require('../scripts/qa-carousel-peeks.cjs')

describe('carousel QA target guard', () => {
  it.each(['http://localhost:3000', 'http://127.0.0.1:3216', 'https://sparkle-suite-smoke.vercel.app'])('allows the approved target %s', (origin) => {
    expect(options(['--base-url', origin]).baseUrl).toBe(origin)
  })
  it.each(['https://www.yoursparklesuite.com', 'https://sparkle-suite-abc.vercel.app', 'https://sparkle-suite-smoke.vercel.app.evil.test', 'http://sparkle-suite-smoke.vercel.app', 'https://sparkle-suite-smoke.vercel.app:1234', 'http://user:pass@localhost:3000', 'http://localhost:3000/other', 'http://localhost:3000/?next=live', 'file:///tmp/index.html'])('rejects nonapproved target %s', (origin) => {
    expect(() => options(['--base-url', origin])).toThrow()
  })
  it('requires explicit origin and validates split-run options', () => {
    expect(() => options([])).toThrow('--base-url is required')
    expect(() => options(['--base-url', 'http://localhost:3000', '--mode', 'typo'])).toThrow('Invalid mode')
    expect(options(['--base-url', 'http://localhost:3000', '--mode', 'portfolio', '--viewport', 'mobile', '--carousel', 'rep-highlights'])).toMatchObject({ mode: 'portfolio', viewport: 'mobile', carousel: 'rep-highlights' })
  })
})
