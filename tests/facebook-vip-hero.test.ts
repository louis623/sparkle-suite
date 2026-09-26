import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { mapPreviewSettingsToHomepageTemplateData } from '@/lib/amethyst/preview-template-data'
import { resolveFacebookVipUrl } from '@/lib/public-site/facebook-vip-hero'
import { isFacebookVipHeroEnabled } from '@/lib/public-site/social-visibility'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

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
  socialHandles: {
    facebook: 'https://www.facebook.com/groups/1485026002799524',
  },
} as SiteSettingsDashboardResult

describe('Facebook VIP landing hero', () => {
  it('accepts a saved Facebook group, page, or handle and rejects anything else', () => {
    expect(resolveFacebookVipUrl('  https://www.facebook.com/groups/1485026002799524  ')).toBe(
      'https://www.facebook.com/groups/1485026002799524',
    )
    expect(resolveFacebookVipUrl('@milehighfizzvip')).toBe(
      'https://www.facebook.com/milehighfizzvip',
    )
    expect(resolveFacebookVipUrl('https://m.facebook.com/groups/vip')).toBe(
      'https://m.facebook.com/groups/vip',
    )
    expect(resolveFacebookVipUrl('')).toBe('')
    expect(resolveFacebookVipUrl('#')).toBe('')
    expect(resolveFacebookVipUrl('https://www.facebook.com/')).toBe('')
    expect(resolveFacebookVipUrl('https://example.com/vip')).toBe('')
    expect(resolveFacebookVipUrl('https://user:pass@facebook.com/groups/vip')).toBe('')
  })

  it('keeps the hero button off unless the rep turns it on, even when a VIP URL is saved', () => {
    expect(isFacebookVipHeroEnabled(undefined)).toBe(false)
    expect(isFacebookVipHeroEnabled({})).toBe(false)
    expect(isFacebookVipHeroEnabled({ facebookVipHero: false })).toBe(false)

    const hidden = mapPreviewSettingsToHomepageTemplateData(settings)
    expect(hidden.showFacebookVipHeroButton).toBe(false)
    expect(hidden.facebookVipUrl).toBe('https://www.facebook.com/groups/1485026002799524')
    expect(hidden.socialHeroLinks).toEqual([])

    const visible = mapPreviewSettingsToHomepageTemplateData({
      ...settings,
      socialVisibility: { facebookVipHero: true },
    })
    expect(visible.showFacebookVipHeroButton).toBe(true)
    expect(visible.facebookVipUrl).toBe(hidden.facebookVipUrl)
    expect(visible.socialHeroLinks).toEqual([
      {
        key: 'facebook',
        label: 'Facebook VIP',
        href: hidden.facebookVipUrl,
      },
    ])

    const empty = mapPreviewSettingsToHomepageTemplateData({
      ...settings,
      socialHandles: {},
      socialVisibility: { facebookVipHero: true },
    })
    expect(empty.showFacebookVipHeroButton).toBe(true)
    expect(empty.facebookVipUrl).toBe('')
    expect(empty.socialHeroLinks).toEqual([])
  })

  it('places the optional button in every landing hero that already has Shop and Watch', () => {
    const jsx = readFileSync(resolve(process.cwd(), 'public/amethyst/homepage.jsx'), 'utf8')
    const layouts = [
      ['function Hero({', 'function buildTickerLoopItems('],
      ['function MileHighFizzHomepage(', 'function BrittWithBlingFeaturedReveal('],
      ['function BrittWithBlingHomepage(', 'function BlingKitchenHomepage('],
      ['function BlingKitchenHomepage(', '// Main App'],
    ] as const

    expect(jsx).toContain('const SOCIAL_HERO_ORDER = ["facebook", "tiktok", "instagram", "whatnot", "youtube"];')
    expect(jsx).toContain('facebook: "Facebook VIP"')
    expect(jsx).toContain('data-hero-cta={link.key}')
    expect(jsx).toContain('target: "_blank"')
    expect(jsx).toContain('rel: "noreferrer noopener"')
    expect(jsx).not.toContain('FacebookVipHeroLink')

    for (const [start, end] of layouts) {
      const layout = jsx.slice(jsx.indexOf(start), jsx.indexOf(end))
      expect(layout).toContain('SocialHeroLinks')
      expect(layout.indexOf('heroWatchLinks.map((link) =>')).toBeLessThan(
        layout.indexOf('SocialHeroLinks'),
      )
    }

    expect(readFileSync(resolve(process.cwd(), 'public/amethyst/join.jsx'), 'utf8')).not.toContain('data-hero-cta')
    expect(readFileSync(resolve(process.cwd(), 'public/amethyst/trade.jsx'), 'utf8')).not.toContain('data-hero-cta')
    expect(readFileSync(resolve(process.cwd(), 'public/amethyst/pantry.jsx'), 'utf8')).not.toContain('data-hero-cta')
  })
})
