import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseRepRenderV2Allowlist, repRenderV2Enabled, shouldUseRepRenderV2 } from '@/lib/amethyst/rep-render-version'
import manifest from '@/lib/amethyst/legacy/manifest.json'
afterEach(() => vi.unstubAllEnvs())
const pages = ['Homepage.html', 'Trade.html', 'Join.html']
const realReps = ['milehighfizz', 'brisglowtique', 'goforthebling', 'brittwithbling', 'blingkitchen', 'blingwithkrissig', 'sparklybutterflies']
it.each(['', undefined])('defaults every rep and every page to legacy with allowlist %s', allowlist => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', allowlist)
  for (const slug of ['dudesfizzfest', ...realReps]) for (const page of pages) {
    expect(repRenderV2Enabled(slug)).toBe(false)
    expect(shouldUseRepRenderV2([page], { publicSiteSlugOverride: slug })).toBe(false)
  }
})
it('preserves the current Production allowlist for all three pages and all seven real reps', () => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  for (const page of pages) {
    expect(shouldUseRepRenderV2([page], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(true)
    for (const slug of realReps) expect(shouldUseRepRenderV2([page], { publicSiteSlugOverride: slug })).toBe(false)
  }
})
it.each(['milehighfizz', 'dudesfizzfest,milehighfizz', ' MileHighFizz , DUDESFIZZFEST '])('enables every page together for listed reps: %s', allowlist => {
  vi.stubEnv('REP_RENDER_V2_SLUGS', allowlist)
  for (const page of pages) {
    expect(shouldUseRepRenderV2([page], { publicSiteSlugOverride: ' MileHighFizz ' })).toBe(true)
    expect(shouldUseRepRenderV2([page], { renderGateSlug: 'MILEHIGHFIZZ' })).toBe(true)
    expect(shouldUseRepRenderV2([page], { publicSiteSlugOverride: 'brisglowtique' })).toBe(false)
    expect(shouldUseRepRenderV2([page], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(allowlist.toLowerCase().includes('dudesfizzfest'))
    expect(shouldUseRepRenderV2([page], {})).toBe(false)
  }
  for (const asset of ['Pantry.html', 'homepage.jsx', 'tokens.css']) expect(shouldUseRepRenderV2([asset], { renderGateSlug: 'milehighfizz' })).toBe(false)
})
it.each(['*', 'milehighfizz:home', 'milehigh fizz', '../x', ', ,', 'sparkle-reviewer-preview', 'api', 'aa', 'a'.repeat(49)])('silently ignores invalid entry %s without enabling a rep', value => {
  expect([...parseRepRenderV2Allowlist(value)]).toEqual([])
  expect(repRenderV2Enabled('milehighfizz', value)).toBe(false)
  expect(repRenderV2Enabled(value, value)).toBe(false)
})
it('retains valid neighbors, normalizes duplicates, and accepts null or undefined', () => {
  expect([...parseRepRenderV2Allowlist('*, MileHighFizz, milehighfizz:home, ../x,, MILEHIGHFIZZ, DUDESFIZZFEST ')]).toEqual(['milehighfizz', 'dudesfizzfest'])
  expect([...parseRepRenderV2Allowlist(null)]).toEqual([])
  expect([...parseRepRenderV2Allowlist(undefined)]).toEqual([])
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'milehighfizz')
  expect(shouldUseRepRenderV2(['Homepage.html'], { publicSiteSlugOverride: '', renderGateSlug: 'milehighfizz' })).toBe(false)
})
it('preserves every frozen Live asset byte for byte', () => {
  for (const [name, record] of Object.entries(manifest.files)) {
    const root = record.source === 'snapshot' ? 'lib/amethyst/legacy/assets' : 'public/amethyst'
    expect(createHash('sha256').update(readFileSync(`${root}/${name}`)).digest('hex'), name).toBe(record.sha256)
  }
})
