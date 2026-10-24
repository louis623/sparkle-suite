import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  getCustomerSiteAppleMarkAssetPath,
  getCustomerSiteExplicitShareLines,
  getCustomerSiteMark,
  getCustomerSiteMarkAssetPath,
  getCustomerSiteMarkFontFamily,
  getCustomerSiteSharePalette,
  getCustomerSiteShareTagline,
} from '@/lib/amethyst/customer-site-brand-assets'

describe('customer-site brand assets', () => {
  it('uses the representative business initial for a stable mark', () => {
    expect(getCustomerSiteMark("Bri's Glowtique", 'Brianna')).toBe('B')
    expect(getCustomerSiteMark('  ', 'Avery')).toBe('A')
  })

  it('normalizes the legacy live-show welcome copy for sharing', () => {
    expect(getCustomerSiteShareTagline('Welcome to Kim Live Show site.')).toBe(
      "Welcome to Kim's Live Show Site.",
    )
    expect(getCustomerSiteShareTagline('Follow along for new reveals.')).toBe(
      'Follow along for new reveals.',
    )
  })

  it('uses the embedded display typeface for every compact mark', () => {
    expect(getCustomerSiteMarkFontFamily('theblingkitchen.com')).toBe(
      '"Playfair Display", Georgia, serif',
    )
    expect(getCustomerSiteMarkFontFamily('www.theblingkitchen.com')).toBe(
      '"Playfair Display", Georgia, serif',
    )
    expect(getCustomerSiteMarkFontFamily('brisglowtique.com')).toBe(
      '"Playfair Display", Georgia, serif',
    )
  })

  it('maps the approved Gnome Forest mark only to Kim\'s customer domain', () => {
    expect(getCustomerSiteMarkAssetPath('goforthebling.com')).toBe(
      '/customer-site-assets/goforthebling-gnome-forest-monogram-g.png',
    )
    expect(getCustomerSiteMarkAssetPath('www.goforthebling.com')).toBe(
      '/customer-site-assets/goforthebling-gnome-forest-monogram-g.png',
    )
    expect(getCustomerSiteMarkAssetPath('yoursparklesuite.com')).toBeNull()
    expect(getCustomerSiteMarkAssetPath('example.com')).toBeNull()
  })

  it('maps BlingwithKrissiG\'s stable B mark to her apex and www hosts only', () => {
    expect(getCustomerSiteMarkAssetPath('blingwithkrissig.com')).toBe(
      '/customer-site-assets/blingwithkrissig-monogram-b.png',
    )
    expect(getCustomerSiteMarkAssetPath('www.blingwithkrissig.com')).toBe(
      '/customer-site-assets/blingwithkrissig-monogram-b.png',
    )
    expect(getCustomerSiteMarkAssetPath('goforthebling.com')).toBe(
      '/customer-site-assets/goforthebling-gnome-forest-monogram-g.png',
    )
    expect(getCustomerSiteMarkAssetPath('brisglowtique.com')).toBe(
      '/customer-site-assets/bris-glowtique-monogram-b.png',
    )
    expect(getCustomerSiteMarkAssetPath('theblingkitchen.com')).toBeNull()
    expect(getCustomerSiteMarkAssetPath('brittwithbling.com')).toBeNull()
    expect(getCustomerSiteAppleMarkAssetPath('blingwithkrissig.com')).toBe(
      '/customer-site-assets/blingwithkrissig-monogram-b.png',
    )
    expect(getCustomerSiteAppleMarkAssetPath('www.blingwithkrissig.com')).toBe(
      '/customer-site-assets/blingwithkrissig-monogram-b.png',
    )
    expect(getCustomerSiteAppleMarkAssetPath('goforthebling.com')).toBeNull()
    expect(getCustomerSiteAppleMarkAssetPath('brisglowtique.com')).toBeNull()
  })

  it('uses a saved hero line, and the tagline when hero fields are empty', () => {
    const generatedSubtitle =
      "I'm Kristin - join me for live reveals, favorite finds, and customer-first sparkle."
    const tagline = 'Live jewelry reveals weekdays at 11:30 AM ET and Saturdays at 5 PM ET'

    expect(getCustomerSiteExplicitShareLines({
      explicitHeroTitle: '',
      heroSubtitle: generatedSubtitle,
      tagline,
    })).toEqual({ headline: tagline, support: '' })

    expect(getCustomerSiteExplicitShareLines({
      explicitHeroTitle: 'Harvest light, real sparkle.',
      heroSubtitle: generatedSubtitle,
      tagline,
    })).toEqual({
      headline: 'Harvest light, real sparkle.',
      support: tagline,
    })

    expect(getCustomerSiteExplicitShareLines({
      explicitHeroTitle: 'Harvest light, real sparkle.',
      heroSubtitle: 'Settle in for the evening reveal.',
      tagline,
    })).toEqual({
      headline: 'Harvest light, real sparkle.',
      support: 'Settle in for the evening reveal.',
    })

    expect(getCustomerSiteExplicitShareLines({
      explicitHeroTitle: '',
      heroSubtitle: '',
      tagline: '',
    })).toEqual({ headline: 'Live jewelry reveals', support: '' })
  })

  it('keeps the share card tied to the selected customer-site skin', () => {
    expect(getCustomerSiteSharePalette('sparkle_suite_morganite')).toMatchObject({
      background: '#5b1e3b',
      accent: '#ee2c9b',
    })
    expect(getCustomerSiteSharePalette('emerald_garden')).toMatchObject({
      background: '#123c35',
      accent: '#059669',
    })
    expect(getCustomerSiteSharePalette('gnome_garden')).toMatchObject({
      background: '#173a28',
      foreground: '#fff7dc',
      secondary: '#f4dfb4',
      accent: '#842421',
    })
    expect(getCustomerSiteSharePalette('rose_gold')).toMatchObject({
      background: '#54202f',
      accent: '#e04f73',
    })
    expect(getCustomerSiteSharePalette('fall_owl_harvest_moon')).toMatchObject({
      background: '#201321',
      foreground: '#fffdfb',
      accent: '#efba73',
    })
  })

  it('builds the Gnome Forest share card from the approved skin artwork', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/opengraph-image.tsx'),
      'utf8',
    )

    expect(source).toContain("brand.preset === 'gnome_garden'")
    expect(source).toContain(
      '/customer-site-assets/goforthebling-gnome-forest-share-forest.jpg',
    )
    expect(source).toContain(
      '/customer-site-assets/goforthebling-gnome-forest-share-gnome.png',
    )
    expect(source).toContain(
      '/customer-site-assets/goforthebling-gnome-forest-share-lantern.png',
    )
    expect(source).toContain('Gnome Forest')
    expect(source).toContain('brand.heroTitle')
    expect(source).toContain('brand.heroSubtitle')
    expect(source).toContain("brand.preset === 'fall_owl_harvest_moon'")
    expect(source).toContain('loadFallOwlShareSceneDataUri')
    expect(source).toContain('getCustomerSiteExplicitShareLines')
  })
})
