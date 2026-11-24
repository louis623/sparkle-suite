import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mapPreviewSettingsToHomepageTemplateData } from '@/lib/amethyst/preview-template-data'
import {
  applyHeroMotionSwitch,
  grandfatheredHeadlineFallback,
  heroMotionApplies,
  homepageRendererVariant,
  isRendererCustomHeroVariant,
  myWebsiteSavePayload,
} from '@/lib/amethyst/hero-motion-applies'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const allowlist = 'dudesfizzfest,milehighfizz,brittwithbling,blingkitchen'

function settings(patch: Partial<SiteSettingsDashboardResult> = {}): SiteSettingsDashboardResult {
  return {
    displayName: 'Sasha',
    businessName: 'Sparkle by Sasha',
    email: 'sasha@example.com',
    phone: '',
    bannerText: '',
    bannerVisible: false,
    tickerText: '',
    tickerVisible: false,
    tagline: 'Live sparkle',
    heroHeadline: 'Real jewelry',
    heroSubtitle: 'Come watch',
    heroImageUrl: '',
    heroAnimationType: 'soft_glow',
    teamName: 'Moonstone',
    recruitingLink: 'https://bombparty.com/sasha/packs',
    showJoinPage: true,
    customerSiteTemplate: 'amethyst',
    appearancePreset: 'amethyst',
    socialHandles: {},
    ...patch,
  }
}

describe('hero motion applies', () => {
  it('follows the renderer: unlisted standard reps, not listed standard reps, and each custom layout', () => {
    expect(heroMotionApplies({
      settings: settings(),
      publicSiteSlug: 'newrep',
      allowlist,
    })).toBe(true)
    expect(heroMotionApplies({
      settings: settings(),
      publicSiteSlug: 'dudesfizzfest',
      allowlist,
    })).toBe(false)

    expect(heroMotionApplies({
      settings: settings({
        businessName: 'Mile High Fizz',
        email: 'lindseychapman1188@gmail.com',
        appearancePreset: 'alpine_opal',
      }),
      publicSiteSlug: 'milehighfizz',
      allowlist,
    })).toBe(true)
    expect(heroMotionApplies({
      settings: settings({
        businessName: 'Britt with Bling',
        teamName: 'The Virtuous Fizzers',
        appearancePreset: 'black_diamond',
      }),
      publicSiteSlug: 'brittwithbling',
      allowlist,
    })).toBe(true)
    for (const publicSiteVariant of ['mile_high_fizz_hybrid', 'britt_with_bling_hybrid', 'bling_kitchen_hybrid']) {
      expect(heroMotionApplies({
        publicSiteSlug: 'dudesfizzfest',
        publicSiteVariant,
        allowlist,
      })).toBe(true)
    }

    // Bling Kitchen settings render the standard homepage, so a listed slug does not get the switch.
    expect(heroMotionApplies({
      settings: settings({
        businessName: 'BlingKitchen',
        email: 'blingkitchen19@gmail.com',
        teamName: 'Opal Sparkling Gems',
      }),
      publicSiteSlug: 'blingkitchen',
      allowlist,
    })).toBe(false)
  })

  it('restores the previous non-still motion when a custom-layout switch turns back on', () => {
    const off = applyHeroMotionSwitch({ on: false, current: 'soft_glow', remembered: null })
    expect(off.heroAnimationType).toBe('still')
    const on = applyHeroMotionSwitch({ on: true, current: off.heroAnimationType, remembered: off.remembered })
    expect(on.heroAnimationType).toBe('soft_glow')
    expect(applyHeroMotionSwitch({ on: true, current: 'still', remembered: null }).heroAnimationType).toBe('sparkle_rise')
  })

  it('leaves heroAnimationType out of an untouched save and keeps the other field names', () => {
    const draft = settings()
    const untouched = myWebsiteSavePayload(draft, { includeHeroAnimation: false })
    expect(untouched).not.toHaveProperty('heroAnimationType')
    expect(untouched).not.toHaveProperty('teamName')
    expect(untouched).not.toHaveProperty('recruitingLink')
    expect(untouched).toMatchObject({
      displayName: 'Sasha',
      businessName: 'Sparkle by Sasha',
      email: 'sasha@example.com',
      tagline: 'Live sparkle',
      heroHeadline: 'Real jewelry',
      heroSubtitle: 'Come watch',
    })

    const turnedOff = myWebsiteSavePayload(
      { ...draft, heroAnimationType: 'still' },
      { includeHeroAnimation: true },
    )
    expect(turnedOff.heroAnimationType).toBe('still')
    expect(turnedOff).not.toHaveProperty('teamName')
    expect(turnedOff).not.toHaveProperty('recruitingLink')
  })

  it('uses the same custom variants as the homepage renderer and mapper', () => {
    const renderer = readFileSync('lib/amethyst/v2/homepage.jsx', 'utf8')
    for (const variant of ['mile_high_fizz_hybrid', 'britt_with_bling_hybrid', 'bling_kitchen_hybrid'] as const) {
      expect(renderer).toContain(`CONTENT.publicSiteVariant === "${variant}"`)
      expect(isRendererCustomHeroVariant(variant)).toBe(true)
    }

    const mileHigh = settings({
      businessName: 'Mile High Fizz',
      email: 'lindseychapman1188@gmail.com',
      appearancePreset: 'alpine_opal',
    })
    const britt = settings({
      businessName: 'Britt with Bling',
      teamName: 'The Virtuous Fizzers',
      appearancePreset: 'black_diamond',
    })
    const kitchen = settings({
      businessName: 'BlingKitchen',
      email: 'blingkitchen19@gmail.com',
      teamName: 'Opal Sparkling Gems',
    })
    for (const [current, slug, variant] of [
      [mileHigh, 'milehighfizz', 'mile_high_fizz_hybrid'],
      [britt, 'brittwithbling', 'britt_with_bling_hybrid'],
      [kitchen, 'blingkitchen', undefined],
    ] as const) {
      expect(homepageRendererVariant(current, slug)).toBe(variant)
      expect(mapPreviewSettingsToHomepageTemplateData(current, { publicSiteSlug: slug }).publicSiteVariant).toBe(variant)
    }
  })

  it('treats a profile row with missing text as a standard site', () => {
    const partial = settings({
      email: undefined as unknown as string,
      businessName: undefined as unknown as string,
      teamName: undefined as unknown as string,
    })
    expect(() => heroMotionApplies({ settings: partial, publicSiteSlug: 'newrep', allowlist })).not.toThrow()
    expect(grandfatheredHeadlineFallback(partial, 'newrep')).toBe(false)
    expect(homepageRendererVariant(partial, 'newrep')).toBeUndefined()
  })

  it('marks the grandfathered headline fallback only for Britt with Bling and Mile High Fizz', () => {
    expect(grandfatheredHeadlineFallback(settings(), 'newrep')).toBe(false)
    expect(grandfatheredHeadlineFallback(settings({
      businessName: 'BlingKitchen',
      email: 'blingkitchen19@gmail.com',
    }), 'blingkitchen')).toBe(false)
    expect(grandfatheredHeadlineFallback(settings({
      businessName: 'Mile High Fizz',
      email: 'lindseychapman1188@gmail.com',
    }), 'milehighfizz')).toBe(true)
    expect(grandfatheredHeadlineFallback(settings({
      businessName: 'Britt with Bling',
    }), 'brittwithbling')).toBe(true)
    expect(grandfatheredHeadlineFallback(settings(), 'brittwithbling')).toBe(true)
  })
})
