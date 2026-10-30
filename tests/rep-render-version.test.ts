import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { repRenderV2Enabled, shouldUseRepRenderV2 } from '@/lib/amethyst/rep-render-version'
import manifest from '@/lib/amethyst/legacy/manifest.json'
afterEach(() => vi.unstubAllEnvs())
it('defaults to nobody, rejects wildcards and other slugs, and enables only the three demo pages', () => {
  expect(repRenderV2Enabled('dudesfizzfest', '')).toBe(false)
  expect(repRenderV2Enabled('dudesfizzfest', '*')).toBe(false)
  expect(repRenderV2Enabled('other', 'other,dudesfizzfest')).toBe(false)
  expect(repRenderV2Enabled('dudesfizzfest', 'dudesfizzfest')).toBe(true)
  expect(repRenderV2Enabled(' DudesFizzFest ', ' other, DUDESFIZZFEST , ')).toBe(true)
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  expect(shouldUseRepRenderV2(['Homepage.html'], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(true)
  for (const asset of ['Homepage.html', 'Trade.html', 'Join.html']) {
    expect(shouldUseRepRenderV2([asset], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(true)
    expect(shouldUseRepRenderV2([asset], { publicSiteSlugOverride: 'blingkitchen' })).toBe(false)
    expect(shouldUseRepRenderV2([asset], {})).toBe(false)
  }
  expect(shouldUseRepRenderV2(['Pantry.html'], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(false)
  expect(shouldUseRepRenderV2(['Homepage.html'], {})).toBe(false)
})
it('preserves every frozen Live asset byte for byte', () => {
  for (const [name, record] of Object.entries(manifest.files)) {
    const root = record.source === 'snapshot' ? 'lib/amethyst/legacy/assets' : 'public/amethyst'
    expect(createHash('sha256').update(readFileSync(`${root}/${name}`)).digest('hex'), name).toBe(record.sha256)
  }
})
