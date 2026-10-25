import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { defaultAmethystHomepageTemplateData, buildAmethystHomepageTweakDefaults } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'

const html = readFileSync('public/amethyst/Homepage.html', 'utf8').replace('<div id="root"></div>', '<div id="root"><main class="public-index">old unstyled copy</main></div>')
describe('real themed first paint and autoplay defaults', () => {
  for (const preset of AMETHYST_APPEARANCE_PRESET_IDS) {
    it(`${preset} renders actual customer content before JavaScript and starts legacy Still as theme motion`, async () => {
      const homepage = { ...defaultAmethystHomepageTemplateData, businessName: 'First-paint shop <safe>', heroMotion: 'still' }
      const result = await renderHomepageFirstPaint(html, { appearancePreset: preset, homepage, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/review-shop'))
      expect(result).toContain('data-server-rendered="true"')
      expect(result).toContain(`data-appearance-preset="${preset}"`)
      expect(result).toContain('First-paint shop &lt;safe&gt;')
      expect(result).toContain('--hp-primary:')
      expect(result).not.toContain('old unstyled copy')
      expect(result).not.toContain('data-hero-motion="off"')
      expect(buildAmethystHomepageTweakDefaults(homepage, preset).heroMotion).not.toBe('still')
    })
  }
  it('isolates rep content across concurrent renders', async () => {
    const render = (name: string) => renderHomepageFirstPaint(html, { appearancePreset: 'amethyst', homepage: { ...defaultAmethystHomepageTemplateData, businessName: name }, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/'))
    const [a, b] = await Promise.all([render('Only Rep Alpha'), render('Only Rep Beta')])
    expect(a).toContain('Only Rep Alpha'); expect(a).not.toContain('Only Rep Beta')
    expect(b).toContain('Only Rep Beta'); expect(b).not.toContain('Only Rep Alpha')
  })
})
