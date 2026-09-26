import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { mapPreviewSettingsToHomepageTemplateData } from '@/lib/amethyst/preview-template-data'
import {
  describeSocialPlacement,
  resolveSocialHeroLinks,
  resolveSocialPlatformUrl,
} from '@/lib/public-site/social-hero'
import { buildPublicSiteVisibilityCss } from '@/lib/public-site/visibility'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const handles = {
  instagram: '@sparkle',
  facebook: 'https://www.facebook.com/groups/1485026002799524',
  tiktok: '@sparklelive',
  youtube: '@sparkle',
  whatnot: 'sparkle',
}

describe('social hero placement', () => {
  it('accepts a real link for each platform and rejects empty or off-domain links', () => {
    expect(resolveSocialPlatformUrl('instagram', '  @sparkle  ')).toBe('https://www.instagram.com/sparkle')
    expect(resolveSocialPlatformUrl('tiktok', '@sparklelive')).toBe('https://www.tiktok.com/@sparklelive')
    expect(resolveSocialPlatformUrl('youtube', 'https://youtu.be/abc123')).toBe('https://youtu.be/abc123')
    expect(resolveSocialPlatformUrl('whatnot', 'sparkle')).toBe('https://www.whatnot.com/user/sparkle')
    expect(resolveSocialPlatformUrl('facebook', 'https://m.facebook.com/groups/vip')).toBe('https://m.facebook.com/groups/vip')

    for (const platform of ['instagram', 'facebook', 'tiktok', 'youtube', 'whatnot'] as const) {
      expect(resolveSocialPlatformUrl(platform, '')).toBe('')
      expect(resolveSocialPlatformUrl(platform, '#')).toBe('')
      expect(resolveSocialPlatformUrl(platform, 'https://example.com/vip')).toBe('')
    }

    expect(resolveSocialPlatformUrl('instagram', 'https://www.instagram.com/')).toBe('')
    expect(resolveSocialPlatformUrl('youtube', 'https://www.youtube.com/')).toBe('')
    expect(resolveSocialPlatformUrl('tiktok', 'https://user:pass@tiktok.com/@sparkle')).toBe('')
  })

  it('keeps hero buttons off by default and renders them in a fixed order only with a real URL', () => {
    expect(resolveSocialHeroLinks({ socialHandles: handles })).toEqual([])
    expect(resolveSocialHeroLinks({
      socialHandles: handles,
      socialVisibility: {
        instagramHero: false,
        facebookVipHero: false,
        tiktokHero: false,
        whatnotHero: false,
        youtubeHero: false,
      },
    })).toEqual([])

    expect(resolveSocialHeroLinks({
      socialHandles: handles,
      socialVisibility: {
        youtubeHero: true,
        instagramHero: true,
        whatnotHero: true,
        tiktokHero: true,
        facebookVipHero: true,
      },
    }).map((link) => link.label)).toEqual([
      'Facebook VIP',
      'TikTok',
      'Instagram',
      'Whatnot',
      'YouTube',
    ])

    expect(resolveSocialHeroLinks({
      socialHandles: { tiktok: 'https://example.com/not-tiktok' },
      socialVisibility: { tiktokHero: true },
    })).toEqual([])
  })

  it('describes footer, hero, both, and hidden without moving existing sites', () => {
    expect(describeSocialPlacement('instagram', '', undefined).summary).toBe('')
    expect(describeSocialPlacement('instagram', '@sparkle', undefined)).toMatchObject({
      showOnSite: true,
      showInHero: false,
      summary: 'Footer',
    })
    expect(describeSocialPlacement('tiktok', '@sparkle', { tiktok: false, tiktokHero: true })).toMatchObject({
      showOnSite: false,
      showInHero: true,
      summary: 'Hero',
    })
    expect(describeSocialPlacement('whatnot', 'sparkle', { whatnot: true, whatnotHero: true })).toMatchObject({
      summary: 'Footer · Hero',
    })
    expect(describeSocialPlacement('youtube', '@sparkle', { youtube: false, youtubeHero: false })).toMatchObject({
      summary: 'Hidden',
    })
    expect(describeSocialPlacement('facebook', 'https://example.com/vip', { facebookVipHero: true }).summary).toBe('')
  })

  it('hides non-hero links when show on site is off and leaves hero buttons alone', () => {
    const css = buildPublicSiteVisibilityCss({
      social: { tiktok: false, tiktokHero: true, facebookVipHero: true },
    })
    expect(css).toContain('a[href^="https://www.tiktok.com/" i]:not([data-hero-cta])')
    expect(css).not.toContain('facebook.com')
    expect(css).not.toContain('instagram.com')
  })

  it('keeps a saved Facebook VIP hero flag and still omits a dead button', () => {
    const settings = {
      displayName: 'Launch Demo Rep',
      businessName: 'Sparkle Suite Demo Boutique',
      email: 'demo@example.com',
      phone: '',
      bannerText: '',
      bannerVisible: false,
      tickerText: '',
      tickerVisible: false,
      tagline: 'Live reveals',
      heroImageUrl: '',
      heroAnimationType: 'sparkle_rise',
      teamName: 'Demo Circle',
      showJoinPage: false,
      customerSiteTemplate: 'amethyst',
      appearancePreset: 'sparkle_suite_morganite',
      socialHandles: handles,
      socialVisibility: { facebook: false, facebookVipHero: true, tiktok: false, tiktokHero: true },
    } as SiteSettingsDashboardResult

    const homepage = mapPreviewSettingsToHomepageTemplateData(settings)
    expect(homepage.socialHeroLinks?.map((link) => link.key)).toEqual(['facebook', 'tiktok'])
    expect(homepage.socialLinks.map((link) => link.label)).toEqual(
      expect.arrayContaining(['Facebook', 'TikTok', 'Instagram']),
    )
  })

  it('uses the same primary CTA classes as Shop and Watch on every landing hero', () => {
    const jsx = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.jsx'), 'utf8')
    const css = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.css'), 'utf8')
    const hero = jsx.slice(jsx.indexOf('function Hero({'), jsx.indexOf('function buildTickerLoopItems('))
    const mileHigh = jsx.slice(jsx.indexOf('function MileHighFizzHomepage('), jsx.indexOf('function BrittWithBlingFeaturedReveal('))
    const britt = jsx.slice(jsx.indexOf('function BrittWithBlingHomepage('), jsx.indexOf('function BlingKitchenHomepage('))
    const kitchen = jsx.slice(jsx.indexOf('function BlingKitchenHomepage('), jsx.indexOf('// Main App'))

    expect(hero).toContain('<a {...linkProps(getShopHref())} className="hp-btn-outline">Shop Bomb Party</a>')
    expect(hero).toContain('className={`hp-btn-outline hp-btn-watch')
    expect(hero).toContain('<SocialHeroLinks className="hp-btn-outline hp-btn-watch" />')

    expect(mileHigh).toContain('className="mhf-cta mhf-cta-shop"')
    expect(mileHigh).toContain('className={`mhf-cta mhf-cta-watch')
    expect(mileHigh).toContain('<SocialHeroLinks className="mhf-cta mhf-cta-watch" />')

    expect(britt).toContain('className="bwb-cta bwb-cta-shop"')
    expect(britt).toContain('className={`bwb-cta bwb-cta-watch')
    expect(britt).toContain('<SocialHeroLinks className="bwb-cta bwb-cta-watch" />')

    expect(kitchen).toContain('<SocialHeroLinks labelClassName="bk-home-cta-label" />')
    expect(css).toContain('.bk-home-hero-cta-primary-row > a[data-hero-cta]')
    expect(css).toContain('background: linear-gradient(135deg, var(--bk-plum), var(--bk-violet));')
  })
})
