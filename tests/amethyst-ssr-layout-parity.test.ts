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

// Louis approved PR #158's additive confirmation styles on November 2.
// Remove only those exact rules when comparing the older no-discount fixture;
// preserve the full existing HTML/CSS comparison instead of refreshing hashes.
const approvedDiscountRules = readFileSync('public/amethyst/homepage.jsx', 'utf8')
  .split(/\r?\n/).filter(line => line.includes('.hp-signup-discount'))
const approvedDiscountCssHash = createHash('sha256').update(approvedDiscountRules.join('\n')).digest('hex')

afterEach(() => vi.restoreAllMocks())

// Normalize CR only, so Windows and Linux checkouts share complete-response
// snapshots. The follow-up refresh includes the requested SSR motion fixes.
for (const preset of AMETHYST_APPEARANCE_PRESET_IDS) {
  for (const [layout, publicSiteVariant] of Object.entries(SSR_REVIEW_LAYOUTS)) {
    if (layout === 'mile_high_fizz') continue
    it(`preserves CR-normalized full SSR HTML for ${preset} / ${layout}`, async () => {
      vi.spyOn(Date, 'now').mockReturnValue(baseline.clock)
      const saved = { ...homepage, heroMotion: 'still', publicSiteVariant }
      const bootstrap = buildAmethystHomepageBootstrapScript(saved, [], preset, { targeted: true })
      const html = await renderHomepageFirstPaint(readFileSync('public/amethyst/Homepage.html', 'utf8'),
        { homepage: saved, join, trade, appearancePreset: preset },
        new URL('https://sparkle-suite-smoke.vercel.app/dudesfizzfest'), bootstrap)
      const key = `${preset}/${layout}` as keyof typeof baseline.hashes
      expect(html).not.toContain('class="hp-signup-discount"')
      expect(approvedDiscountRules).toHaveLength(8)
      // The exact CSS fingerprint below prevents new styles being silently exempted.
      expect(approvedDiscountCssHash).toBe('9d6f93e9fc3a190f7e9ee48ed03cab270eedc104f6a4c90302503c0556bddaff')
      let comparable = html.replace(/\r/g, '')
      for (const rule of approvedDiscountRules) comparable = comparable.replace(rule + '\n', '')
      expect(createHash('sha256').update(comparable).digest('hex')).toBe(baseline.hashes[key])
    })
  }
}
