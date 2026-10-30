import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'
import { SSR_REVIEW_LAYOUTS } from '@/lib/amethyst/homepage-smoke-review'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import baseline from './fixtures/amethyst-ssr-non-mhf-sha256.json'

afterEach(() => vi.restoreAllMocks())

// Captured from the unmodified application at the required PR base. Hash the
// complete response, including styles, bootstrap and early controls, not just H1.
for (const preset of AMETHYST_APPEARANCE_PRESET_IDS) {
  for (const [layout, publicSiteVariant] of Object.entries(SSR_REVIEW_LAYOUTS)) {
    if (layout === 'mile_high_fizz') continue
    it(`preserves full base SSR HTML bytes for ${preset} / ${layout}`, async () => {
      vi.spyOn(Date, 'now').mockReturnValue(baseline.clock)
      const saved = { ...homepage, heroMotion: 'still', publicSiteVariant }
      const bootstrap = buildAmethystHomepageBootstrapScript(saved, [], preset, { targeted: true })
      const html = await renderHomepageFirstPaint(readFileSync('public/amethyst/Homepage.html', 'utf8'),
        { homepage: saved, join, trade, appearancePreset: preset },
        new URL('https://sparkle-suite-smoke.vercel.app/dudesfizzfest'), bootstrap)
      const key = `${preset}/${layout}` as keyof typeof baseline.hashes
      expect(createHash('sha256').update(html).digest('hex')).toBe(baseline.hashes[key])
    })
  }
}
