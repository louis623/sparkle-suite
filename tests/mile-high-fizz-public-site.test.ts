import { describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  loadAmethystPreviewTemplateData,
  mapPreviewSettingsToHomepageTemplateData,
  mapPreviewSettingsToJoinTemplateData,
  mapPreviewSettingsToTradeTemplateData,
} from '@/lib/amethyst/preview-template-data'
import { buildAmethystHomepageBootstrapScript } from '@/lib/amethyst/homepage-template-data'
import { getAmethystSkinCard, getAmethystSkinDropdownLabel } from '@/lib/amethyst/skin-cards'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const mileHighFizzSettings: SiteSettingsDashboardResult = {
  displayName: 'Lindsey Chapman',
  businessName: 'Mile High Fizz',
  email: 'lindseychapman1188@gmail.com',
  phone: '',
  bannerText: 'Mile High Fizz updates',
  bannerVisible: true,
  tickerText: 'New show reminders and sparkle updates from Lindsey.',
  tickerVisible: true,
  tagline: 'Revealing something magical together.',
  heroImageUrl: '',
  heroAnimationType: 'sparkle_rise',
  teamName: 'Diamond Peak Society',
  joinTeamAccessEnabled: true,
  showJoinPage: true,
  customerSiteTemplate: 'amethyst',
  appearancePreset: 'alpine_opal',
  socialHandles: {
    tiktok: '@lindze1188',
    facebook: 'MileHighFizz',
    instagram: '',
  },
}

const mileHighFizzExtras = {
  shopLink: 'https://www.bombparty.com/party/123456',
  streamingLinks: {
    tiktok: 'https://www.tiktok.com/@lindze1188',
    facebook: 'https://www.facebook.com/groups/milehighfizzvip',
  },
}

function viCreateAdminClient() {
  return vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient
}

describe('Mile High Fizz hybrid public site contract', () => {
  it('restores the original layout after a community skin is selected', () => {
    const savedVideo = 'https://www.tiktok.com/@lindze1188/video/7598018448039480607'
    const settings = {
      ...mileHighFizzSettings,
      homepageMediaSlots: [{ key: 'showcase' as const, caption: 'My show', imageUrl: '', videoUrl: savedVideo }],
    }
    const halloweenSettings = { ...settings, appearancePreset: 'halloween_pumpkin_witch' as const }
    const halloweenHome = mapPreviewSettingsToHomepageTemplateData(halloweenSettings, mileHighFizzExtras)
    const halloweenTrade = mapPreviewSettingsToTradeTemplateData(halloweenSettings, mileHighFizzExtras)
    const halloweenJoin = mapPreviewSettingsToJoinTemplateData(halloweenSettings, mileHighFizzExtras, [])

    expect(halloweenHome.publicSiteVariant).toBeUndefined()
    expect(halloweenTrade.publicSiteVariant).toBeUndefined()
    expect(halloweenJoin.publicSiteVariant).toBeUndefined()
    expect(halloweenHome.heroVideoUrl).toBeUndefined()
    expect(halloweenHome.heroHeadline).toBe('Mile High Fizz')
    expect(halloweenHome.heroSub).toBe(settings.tagline)
    expect(halloweenHome.showcaseVideoUrl).toBe(savedVideo)
    expect(buildAmethystHomepageBootstrapScript(halloweenHome, [], halloweenSettings.appearancePreset))
      .toContain('"preset":"halloween_pumpkin_witch"')

    const restoredHome = mapPreviewSettingsToHomepageTemplateData(settings, mileHighFizzExtras)
    expect(restoredHome.publicSiteVariant).toBe('mile_high_fizz_hybrid')
    expect(restoredHome.heroVideoUrl).toBe('/mile-high-fizz/hero.mp4')
    expect(restoredHome.showcaseVideoUrl).toBe(savedVideo)
    expect(getAmethystSkinDropdownLabel(getAmethystSkinCard('alpine_opal')))
      .toContain('Lindsey’s original custom skin')
  })

  it('maps Lindsey to a Mile High Fizz homepage instead of a generic Sparkle shell', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      mileHighFizzSettings,
      mileHighFizzExtras,
    )

    expect(homepage.repName).toBe('Lindsey')
    expect(homepage.businessName).toBe('Mile High Fizz')
    expect(homepage.heroHeadline).toBe('Mile High Fizz')
    expect(homepage.heroSub).toContain('Revealing something magical together')
    expect((homepage as { heroVideoUrl?: string }).heroVideoUrl).toBe(
      '/mile-high-fizz/hero.mp4',
    )
    expect((homepage as { promoTickerText?: string }).promoTickerText).toContain(
      '10TH ANNIVERSARY SPECIAL',
    )
    expect((homepage as { announcementText?: string }).announcementText).toContain(
      'Introducing the Sterling Club',
    )
    expect(homepage.aboutHeadline).toBe('What is a Bomb Party?')
    expect(homepage.aboutParagraphs.join(' ')).toContain(
      'Experience the thrilling, must-watch excitement of a Bomb Party jewelry reveal',
    )
    expect(homepage.signupTitle).toBe('Never Miss a Show!')
    expect(homepage.joinTeamUrl).toBe('/amethyst/Join.html')
    expect(homepage.footerLinks.joinTeam).toBe('/amethyst/Join.html')
    expect(homepage.footerLinks.faq).toBe('#signup')
    expect(homepage.publicSiteVariant).toBe('mile_high_fizz_hybrid')
    expect(homepage.streamLinks.tiktok).toBe('https://www.tiktok.com/@lindze1188')
    expect(homepage.streamLinks.facebook).toBe(
      'https://www.facebook.com/groups/milehighfizzvip',
    )
  })

  it('keeps a configured showcase video instead of replacing it with the profile link', () => {
    const videoUrl = 'https://www.tiktok.com/@lindze1188/video/7598018448039480607'
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      {
        ...mileHighFizzSettings,
        homepageMediaSlots: [
          { key: 'showcase', caption: '', imageUrl: '', videoUrl },
        ],
      },
      mileHighFizzExtras,
    )

    expect(homepage.showcaseVideoUrl).toBe(videoUrl)
  })

  it('keeps future Site Settings changes across the Mile High Fizz public pages', () => {
    const futureSettings: SiteSettingsDashboardResult = {
      ...mileHighFizzSettings,
      displayName: 'Lia Harper',
      businessName: 'Summit Sparkle',
      teamName: 'Summit Society',
      tagline: 'Sparkle at the summit.',
      showJoinPage: false,
      aboutNarrative:
        'First custom paragraph.\n\nSecond custom paragraph.\n\nThird custom paragraph.',
      socialHandles: {
        ...mileHighFizzSettings.socialHandles,
        tiktok: '@liasparkles',
      },
    }
    const futureExtras = {
      ...mileHighFizzExtras,
      streamingLinks: {
        ...mileHighFizzExtras.streamingLinks,
        tiktok: '',
      },
    }
    const homepage = mapPreviewSettingsToHomepageTemplateData(futureSettings, futureExtras)
    const trade = mapPreviewSettingsToTradeTemplateData(futureSettings, futureExtras)
    const join = mapPreviewSettingsToJoinTemplateData(futureSettings, futureExtras)

    expect(homepage.repName).toBe('Lia')
    expect(homepage.businessName).toBe('Summit Sparkle')
    expect(homepage.teamName).toBe('Summit Society')
    expect(homepage.tagline).toBe('Sparkle at the summit.')
    expect(homepage.heroSub).toBe('Sparkle at the summit.')
    expect(homepage.footerTagline).toBe('Sparkle at the summit.')
    expect(homepage.aboutParagraphs).toEqual([
      'First custom paragraph.',
      'Second custom paragraph.',
      'Third custom paragraph.',
    ])
    expect(homepage.showJoinPage).toBe(false)
    expect(homepage.footerLinks.joinTeam).toBeUndefined()
    expect(homepage.streamLinks.tiktok).toBe('https://www.tiktok.com/@liasparkles')
    expect(trade.tradeHeroTitle).toBe('Summit Sparkle Dance Floor')
    expect(trade.footerLinks.joinTeam).toBeUndefined()
    expect(join.teamName).toBe('Summit Society')
    expect(join.heroTitle).toBe('Welcome to the Summit Society')
    expect(join.heroPitch).toContain('Summit Society')
    expect(join.repSocialLinks.tiktok).toBe('https://www.tiktok.com/@liasparkles')
  })

  it('serializes the protected Mile High Fizz variant for static runtime branching', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      mileHighFizzSettings,
      mileHighFizzExtras,
    )
    const script = buildAmethystHomepageBootstrapScript(homepage)

    expect(script).toContain('"publicSiteVariant":"mile_high_fizz_hybrid"')
  })

  it('serializes Mile High Fizz as a theme-switchable Alpine Opal site', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      mileHighFizzSettings,
      mileHighFizzExtras,
    )
    const alpineOpalScript = buildAmethystHomepageBootstrapScript(
      homepage,
      [],
      'alpine_opal',
    )
    const moonstoneScript = buildAmethystHomepageBootstrapScript(
      homepage,
      [],
      'moonstone',
    )

    expect(alpineOpalScript).toContain('"publicSiteVariant":"mile_high_fizz_hybrid"')
    expect(alpineOpalScript).toContain('"preset":"alpine_opal"')
    expect(alpineOpalScript).toContain('"bgTreatment":"alpine-opal"')
    expect(moonstoneScript).toContain('"preset":"moonstone"')
    expect(moonstoneScript).toContain('"bgTreatment":"moonstone-charcoal"')
  })

  it('activates Join navigation through the standard footer link model', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(jsx).toContain('const isMileHighFizzHybrid')
    expect(jsx).toContain('CONTENT.footerLinks?.joinTeam && (')
    expect(jsx).toContain(
      '<a {...linkProps(CONTENT.footerLinks.joinTeam)} className="hp-header-link">Join Team</a>',
    )
    expect(jsx).toContain('Join Team</a>')
  })

  it('renders Mile High Fizz as the migrated Readdy site shell instead of a generic Amethyst hero', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('function MileHighFizzHomepage')
    expect(jsx).toContain('function SparkleSuiteHeaderStack')
    expect(jsx).toContain('<SparkleSuiteHeaderStack t={t} scheduleIsLive={isLive} effectiveLrqState={queueState} onOpenQueue={onOpenQueue} />')
    expect(jsx).not.toContain('mhf-header-menu')
    expect(jsx).toContain('<video')
    expect(jsx).toContain('CONTENT.heroVideoUrl')
    expect(jsx).toContain('Shop Bomb Party')
    expect(jsx).toContain('Join My Team')
    expect(jsx).toContain('getHeroWatchLinks(liveShow, isLive)')
    expect(jsx).toContain('CONTENT.heroSub || "REVEALING SOMETHING MAGICAL TOGETHER"')
    expect(jsx).toContain('MileHighFizzHomepage')
    expect(jsx).toContain('body.classList.add("mile-high-fizz")')
    expect(css).toContain('.mhf-hero-video')
    expect(css).toContain('.mhf-logo-gradient')
    expect(css).toContain('.mhf-cta-shop')
    expect(css).toContain('.mhf-cta-join')
    expect(css).toContain('.mhf-cta-watch')
  })

  it('self-hosts the Mile High Fizz hero video asset', () => {
    expect(
      existsSync(resolve(process.cwd(), 'public/mile-high-fizz/hero.mp4')),
    ).toBe(true)
  })

  it('restyles below-hero Sparkle automations in Mile High Fizz branding', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )

    expect(jsx).toContain('mhf-below-hero-shell')
    expect(jsx).toContain('mhf-automation-panel')
    expect(css).toContain('.mhf-below-hero-shell')
    expect(css).toContain('body.mile-high-fizz .mhf-automation-panel .hp-section')
    expect(css).toContain('body.mile-high-fizz .mhf-automation-panel #wibp')
    expect(css).toContain('body.mile-high-fizz .mhf-automation-panel .hp-event-card')
    expect(css).toContain('body.mile-high-fizz .mhf-automation-panel .hp-signup-card')
    expect(css).toContain('body.mile-high-fizz .mhf-automation-panel .hp-footer')
    expect(css).toContain('--mhf-primary: var(--hp-primary)')
    expect(css).toContain('--mhf-accent: var(--hp-accent)')
    expect(css).toContain('--mhf-bg: var(--hp-bg)')
    expect(css).toContain('--mhf-bg-elevated: var(--hp-bg-elevated)')
  })

  it('keeps Dance Floor standard while dressing it for Mile High Fizz', () => {
    const trade = mapPreviewSettingsToTradeTemplateData(
      mileHighFizzSettings,
      mileHighFizzExtras,
    )

    expect(trade.businessName).toBe('Mile High Fizz')
    expect(trade.repName).toBe('Lindsey')
    expect(trade.tradeHeroTitle).toContain('Mile High Fizz Dance Floor')
    expect(trade.tradeRules).toContain('Item-for-item only.')
    expect(trade.footerLinks.home).toBe('/amethyst/Homepage.html')
    expect(trade.footerLinks.tradeBoard).toBe('/amethyst/Trade.html')
    expect(trade.footerLinks.joinTeam).toBe('/amethyst/Join.html')
    expect((trade as { publicSiteVariant?: string }).publicSiteVariant).toBe(
      'mile_high_fizz_hybrid',
    )
  })

  it('renders the public Dance Floor in Mile High Fizz styling without changing mechanics', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )

    expect(jsx).toContain('const isMileHighFizzHybrid')
    expect(jsx).toContain('mhf-trade-page')
    expect(jsx).toContain('mhf-trade-shell')
    expect(jsx).toContain('mhf-trade-board-panel')
    expect(css).toContain('body.mile-high-fizz-trade')
    expect(css).toContain('.mhf-trade-shell')
    expect(css).toContain('body.mile-high-fizz-trade .tp-hero')
    expect(css).toContain('body.mile-high-fizz-trade .tp-filters')
    expect(css).toContain('body.mile-high-fizz-trade .tp-card')
    expect(css).toContain('body.mile-high-fizz-trade .tp-sheet')
    expect(css).toContain('body.mile-high-fizz-trade .hp-footer')
    expect(css).toContain('--mhf-primary: var(--hp-primary)')
    expect(css).toContain('--mhf-accent: var(--hp-accent)')
    expect(css).toContain('--mhf-bg: var(--hp-bg)')
    expect(css).toContain('--mhf-bg-elevated: var(--hp-bg-elevated)')
  })

  it('recreates Lindsey join page content for the internal Sparkle page', () => {
    const join = mapPreviewSettingsToJoinTemplateData(
      mileHighFizzSettings,
      mileHighFizzExtras,
    )

    expect(join.businessName).toBe('Mile High Fizz')
    expect(join.teamName).toBe('Diamond Peak Society')
    expect((join as { publicSiteVariant?: string }).publicSiteVariant).toBe(
      'mile_high_fizz_hybrid',
    )
    expect((join as { heroTitle?: string }).heroTitle).toBe(
      'Welcome to the Diamond Peak Society',
    )
    expect(join.promoText).toContain('current official starter-pack options')
    expect(join.heroPitch).toContain('official requirements')
    expect(join.finalPitch).toContain('before you decide')
    expect(join.faqAnswers.whatIsTeam).toContain('support is available now')
    expect(join.faqAnswers.whatIsTeam).toContain('Diamond Peak Society')
    expect(join.faqAnswers.support).toContain('currently available')
    expect(join.footerLinks.home).toBe('/amethyst/Homepage.html')
    expect(join.footerLinks.tradeBoard).toBe('/amethyst/Trade.html')
    expect(join.footerLinks.joinTeam).toBe('/amethyst/Join.html')
  })

  it('preserves custom Mile High Fizz Join copy in targeted preview loads', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-mile-high-fizz',
      publicSiteSlug: 'milehighfizz',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: viCreateAdminClient(),
        resolveAmethystPreviewRep: async () => ({
          id: 'rep-mile-high-fizz',
          email: 'lindseychapman1188@gmail.com',
          shop_link: mileHighFizzExtras.shopLink,
          streaming_links: mileHighFizzExtras.streamingLinks,
        }),
        getSiteSettingsDashboard: async () => mileHighFizzSettings,
        getRequiredSetupState: async () => ({
          id: 'setup-mile-high-fizz',
          repId: 'rep-mile-high-fizz',
          status: 'dashboard_unlocked',
          currentStep: 'final_preview_approval',
          completedSteps: [],
          steps: REQUIRED_SETUP_STEPS,
          answers: {},
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: '2026-06-17T14:19:21.563Z',
          createdAt: null,
          updatedAt: null,
          nextStep: null,
          canUnlockDashboard: true,
        }),
      },
    })

    expect(data.homepage.publicSiteVariant).toBe('mile_high_fizz_hybrid')
    expect((data.join as { publicSiteVariant?: string }).publicSiteVariant).toBe(
      'mile_high_fizz_hybrid',
    )
    expect((data.join as { heroTitle?: string }).heroTitle).toBe(
      'Welcome to the Diamond Peak Society',
    )
    expect(data.join.heroPitch).toContain('official requirements')
    expect(data.join.faqAnswers.whatIsTeam).toContain('support is available now')
    expect(data.homepage.footerLinks.home).toBe('/milehighfizz')
    expect(data.homepage.footerLinks.tradeBoard).toBe('/milehighfizz/trade')
    expect(data.homepage.footerLinks.joinTeam).toBe('/milehighfizz/join')
    expect(data.join.footerLinks.joinTeam).toBe('/milehighfizz/join')
  })

  it('renders the public Join page in Mile High Fizz styling with migrated Join copy', () => {
    const jsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )

    expect(jsx).toContain('const isMileHighFizzHybrid')
    expect(jsx).toContain('mhf-join-page')
    expect(jsx).toContain('mhf-join-shell')
    expect(jsx).toContain('CONTENT.heroTitle')
    expect(css).toContain('body.mile-high-fizz-join')
    expect(css).toContain('.mhf-join-shell')
    expect(css).toContain('body.mile-high-fizz-join .jp-hero')
    expect(css).toContain('body.mile-high-fizz-join .jp-section')
    expect(css).toContain('body.mile-high-fizz-join .jp-benefit-card')
    expect(css).toContain('body.mile-high-fizz-join .jp-faq-item')
    expect(css).toContain('body.mile-high-fizz-join .jp-final-card')
    expect(css).toContain('--mhf-primary: var(--hp-primary)')
    expect(css).toContain('--mhf-accent: var(--hp-accent)')
    expect(css).toContain('--mhf-bg: var(--hp-bg)')
    expect(css).toContain('--mhf-bg-elevated: var(--hp-bg-elevated)')
  })
})
