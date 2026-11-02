import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'
import { HERO_MOTION_THEMES } from '@/lib/amethyst/hero-motion-config'
import { SSR_REVIEW_LAYOUTS } from '@/lib/amethyst/homepage-smoke-review'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'

const listings = [{ id: 'ssr-test-only', name: 'SSR jewelry first paint', collection: 'Originals', type: 'Earrings', material: 'Silver', stone: 'CZ', size: null, note: 'Test listing', glyph: 'S', tier: 'everyday' as const, photoUrl: null, photoSource: 'missing' as const }]
for (const page of ['trade', 'join'] as const) {
  const source = readFileSync(`public/amethyst/${page === 'trade' ? 'Trade' : 'Join'}.html`, 'utf8')
  for (const preset of AMETHYST_APPEARANCE_PRESET_IDS) for (const [layout, publicSiteVariant] of Object.entries(SSR_REVIEW_LAYOUTS)) {
    it(`SSR ${page} / ${preset} / ${layout} with saved Still and first-paint content`, async () => {
      const saved = { heroMotion: 'still', publicSiteVariant }
      const pageTrade = { ...trade, ...saved }
      const pageJoin = { ...join, ...saved, teamMembers: [{ ...join.teamMembers[0], name: 'SSR roster first paint' }] }
      const bootstrap = page === 'trade' ? buildAmethystTradeBootstrapScript(pageTrade, listings, preset, { targeted: true })
        : buildAmethystJoinBootstrapScript(pageJoin, preset, { targeted: true }, listings)
      const html = await renderAmethystPageFirstPaint(page, source, { homepage: { ...homepage, ...saved }, join: pageJoin, trade: pageTrade, appearancePreset: preset }, new URL(`https://sparkle-suite-smoke.vercel.app/dudesfizzfest/${page}`), bootstrap)
      const tree = html.split('<div id="root" data-server-rendered="true">')[1]?.split('</div><script>')[0]
      expect(tree).toBeTruthy()
      if (layout === 'mile_high_fizz') expect(tree).not.toContain('data-ssr-hero=')
      else expect(tree).toContain(`data-ssr-hero="${preset}"`)
      expect(tree?.match(/<h1\b/g)).toHaveLength(1)
      expect(tree).toContain(page === 'trade' ? 'SSR jewelry first paint' : 'SSR roster first paint')
      expect(html).toContain(`data-ssr-style="${page}.css"`)
      expect(html).toContain('data-ssr-fonts')
      expect(html).toContain('document.fonts.load(font)')
      expect(html).toContain('/amethyst/ssr-fonts/')
      expect(html).toContain(`/amethyst/compiled/${page}.js`)
      expect(html).not.toMatch(/react\.development|babel|data-template-src=/)
      if (layout === 'mile_high_fizz') {
        expect(tree).not.toContain('data-hero-motion-toggle=""')
        if (preset !== 'gnome_garden') expect(tree).not.toContain('Pause animation')
      } else expect(tree).toContain('data-hero-motion-toggle=""')
      // Utility pages retain their compact static banner; existing ornaments animate.
      expect(tree).not.toContain('<video')
      if (HERO_MOTION_THEMES[preset].kind === 'decoration' && (layout !== 'mile_high_fizz' || preset === 'gnome_garden')) expect(tree).toContain('data-paused="false"')
      expect(saved.heroMotion).toBe('still')
    })
  }
}

it('keeps original utility source untouched and shares the same no-rest controller', () => {
  for (const page of ['trade', 'join']) {
    const source = readFileSync(`lib/amethyst/v2/${page}.jsx`, 'utf8')
    expect(source).toContain('import { HeroMotionScene, SparkleFx as SharedSparkleFx }')
    expect(source).toContain('ReactDOM.hydrateRoot')
    expect(source).not.toMatch(/setTimeout\([^)]*play|\.pause\(/)
  }
})
