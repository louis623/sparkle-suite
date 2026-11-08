import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { getAmethystSkinCard, getCommunityAmethystSkinCards } from '../lib/amethyst/skin-cards'
import { cardQrDesignThemeOptions, readCardQrDesignTheme } from '../lib/workspace/card-qr/design-theme'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '../lib/amethyst/homepage-template-data'
import { renderBizcardFront } from '../lib/workspace/card-qr/bizcard-render'
import { homepageSmokeReview } from '../lib/amethyst/homepage-smoke-review'
import { defaultAmethystJoinTemplateData as join } from '../lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '../lib/amethyst/trade-template-data'

const id = 'macies_christmas_globe'
describe("Macie's Christmas Globe", () => {
  it('limits the catalog and print selection to the issued design', () => {
    expect(getAmethystSkinCard(id)).toMatchObject({ visibility: 'private', code: 'MG-01' })
    expect(getCommunityAmethystSkinCards().map(card => card.id)).not.toContain(id)
    expect(cardQrDesignThemeOptions('amethyst', 'amethyst').map(x => x.preset)).not.toContain(id)
    expect(() => readCardQrDesignTheme(id, 'amethyst')).toThrow()
    expect(cardQrDesignThemeOptions(id, 'macies-christmas-globe')[0].preset).toBe(id)
  })
  it('uses the approved seasonal copy and honors a saved headline', () => {
    const data = { ...defaultAmethystHomepageTemplateData, repName: 'Katelin Lawrence', businessName: 'Main Gem Co.' }
    expect(buildAmethystHomepageTweakDefaults(data, id)).toMatchObject({ heroHeadline: 'Christmas at Main Gem Co.', heroSub: 'Join Katelin and Macie Grey for live jewelry reveals.' })
    expect(buildAmethystHomepageTweakDefaults({ ...data, heroHeadlineOverride: 'Tonight’s reveal' }, id).heroHeadline).toBe('Tonight’s reveal')
  })
  it('preserves the face and gift area for short and long print titles', async () => {
    for (const showTitle of ['Main Gem Co.', 'A Little Christmas Sparkle With Friends']) {
      const front = await renderBizcardFront({ key: 'macies-christmas-globe', firstName: 'Katelin', showTitle })
      for (const box of front.boxes) {
        expect(box.x).toBeGreaterThan(75)
        expect(box.x2).toBeLessThan(550)
        expect(box.y).toBeGreaterThan(75)
        expect(box.y2).toBeLessThan(420)
      }
    }
  })
  it('uses the saved motion preference in the Smoke preview', () => {
    const saved = { appearancePreset: 'amethyst' as const, homepage: { ...defaultAmethystHomepageTemplateData, heroMotion: 'still' as const }, join, trade }
    const url = new URL('https://sparkle-suite-smoke.vercel.app/dudesfizzfest?ssrReviewTheme=' + id)
    try {
      vi.stubEnv('VERCEL_ENV', 'preview')
      vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
      vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pukemqiwlyqmyytxkdmo.supabase.co')
      expect(homepageSmokeReview(saved, url, 'dudesfizzfest').homepage.heroMotion).toBe('still')
      expect(homepageSmokeReview(saved, url, 'milehighfizz')).toBe(saved)
      vi.stubEnv('VERCEL_ENV', 'production')
      expect(homepageSmokeReview(saved, url, 'dudesfizzfest')).toBe(saved)
      expect(saved.homepage.heroMotion).toBe('still')
    } finally { vi.unstubAllEnvs() }
  })
  it('serves phone media within the budget and prevents a public preview grant', () => {
    expect(readFileSync('public/amethyst/skins/macies-christmas-globe/hero-loop-phone.mp4').length).toBeLessThan(500000)
    expect(readFileSync('public/amethyst/skins/macies-christmas-globe/hero-poster-phone.webp').length).toBeLessThan(60000)
    const route = readFileSync('app/skin-preview/[skin]/[page]/route.ts', 'utf8')
    expect(route).toContain('isAmethystSkinSelectionAvailableToRep(context.supabase, skin, context.repId)')
  })
})
