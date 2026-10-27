import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { withinHomepageDataBudget, HOMEPAGE_PAGE_DATA_BUDGET_MS } from '@/lib/amethyst/homepage-data-budget'

const require = createRequire(import.meta.url)
const { garbledSequences, normalizeRepResponse } = require('../scripts/qa/normalize-rep-response.cjs')
afterEach(() => vi.useRealTimers())

it.each(['lib/amethyst/v2/homepage.jsx', 'public/amethyst/compiled/homepage.js'])('has no raw or Unicode-escaped mojibake in %s', file => {
  expect(garbledSequences(readFileSync(file, 'utf8'))).toEqual([])
})
it('recognizes every banned sequence in raw, escaped, and mixed forms', () => {
  const bad = [[0xe2,0x20ac],[0xc2,0xb7],[0xc2,0xa9],[0xe2,0x153],[0xe2,0x2020],[0xe2,0x2013],[0xc3,0x2014]]
  for (const codes of bad) {
    const raw = String.fromCodePoint(...codes)
    const escaped = codes.map(code => '\\u' + code.toString(16).padStart(4, '0')).join('')
    expect(garbledSequences(raw)).toHaveLength(1)
    expect(garbledSequences(escaped)).toHaveLength(1)
    expect(garbledSequences(raw[0] + escaped.slice(6))).toHaveLength(1)
  }
  expect(garbledSequences('\u2014 \u00b7 \u2026 \u2726 \u2192 \u25b6 \u00a9 \u00d7')).toEqual([])
})
it('normalizes only the permitted GA, origin, deployment and build identifiers', () => {
  const live = '<html data-dpl-id="dpl_LIVE"><script src="https://live.test/_next/static/chunks/abcd1234.js"></script><p>Fizz Festival</p></html>'
  const preview = '<html data-dpl-id="dpl_PREVIEW"><script src="https://preview.test/_next/static/chunks/ffff1234.js"></script><p>Fizz Festival</p></html>'
  expect(normalizeRepResponse(live)).toBe(normalizeRepResponse(preview))
  expect(normalizeRepResponse(preview.replace('Fizz Festival', 'Other rep'))).not.toBe(normalizeRepResponse(live))
  expect(normalizeRepResponse(live + ' ')).not.toBe(normalizeRepResponse(live))
  expect(normalizeRepResponse('https://live.test?rep=one')).toBe('<ORIGIN>?rep=one')
  expect(normalizeRepResponse('https://preview.test?rep=two')).not.toBe(normalizeRepResponse('https://live.test?rep=one'))
  expect(normalizeRepResponse('<script id="sparkle-rep-ga4">gtag("config","G-X");</script>\n<p>Same</p>')).toBe('<p>Same</p>')
})
it('stops waiting at the 50ms data budget without caching a late result', async () => {
  vi.useFakeTimers()
  expect(HOMEPAGE_PAGE_DATA_BUDGET_MS).toBe(50)
  const pending = withinHomepageDataBudget(new Promise(() => {}))
  await vi.advanceTimersByTimeAsync(50)
  expect(await pending).toBeUndefined()
  expect(await withinHomepageDataBudget(Promise.resolve('fresh next request'))).toBe('fresh next request')
})
