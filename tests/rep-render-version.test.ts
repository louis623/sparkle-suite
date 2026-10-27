import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { repRenderV2Enabled, shouldUseRepRenderV2 } from '@/lib/amethyst/rep-render-version'
import manifest from '@/lib/amethyst/legacy/manifest.json'
afterEach(() => vi.unstubAllEnvs())
it('defaults to nobody, rejects wildcards and other slugs, and enables only this homepage', () => {
  expect(repRenderV2Enabled('dudesfizzfest', '')).toBe(false)
  expect(repRenderV2Enabled('dudesfizzfest', '*')).toBe(false)
  expect(repRenderV2Enabled('other', 'other,dudesfizzfest')).toBe(false)
  expect(repRenderV2Enabled('dudesfizzfest', 'dudesfizzfest')).toBe(true)
  vi.stubEnv('REP_RENDER_V2_SLUGS', 'dudesfizzfest')
  expect(shouldUseRepRenderV2(['Homepage.html'], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(true)
  expect(shouldUseRepRenderV2(['Trade.html'], { publicSiteSlugOverride: 'dudesfizzfest' })).toBe(false)
  expect(shouldUseRepRenderV2(['Homepage.html'], {})).toBe(false)
})
it('preserves every frozen Live asset byte for byte', () => {
  for (const [name, record] of Object.entries(manifest.files)) {
    const root = record.source === 'snapshot' ? 'lib/amethyst/legacy/assets' : 'public/amethyst'
    expect(createHash('sha256').update(readFileSync(`${root}/${name}`)).digest('hex'), name).toBe(record.sha256)
  }
})
