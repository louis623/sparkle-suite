import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  loadAmethystPreviewTemplateData,
  mapPreviewSettingsToHomepageTemplateData,
  mapPreviewSettingsToJoinTemplateData,
  mapPreviewSettingsToTradeTemplateData,
} from '@/lib/amethyst/preview-template-data'
import {
  buildAmethystHomepageBootstrapScript,
  enrichAmethystHomepageFeatureData,
} from '@/lib/amethyst/homepage-template-data'
import {
  BRITT_WITH_BLING_PROFILE,
  BRITT_WITH_BLING_TEAM_MEMBERS,
} from '@/lib/britt-with-bling/profile'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { JoinTeamMember, SiteSettingsDashboardResult } from '@/lib/services/types'

const brittWithBlingSettings: SiteSettingsDashboardResult = {
  displayName: 'Brittany',
  businessName: 'Britt with Bling',
  email: 'brittany@example.com',
  phone: '',
  bannerText: BRITT_WITH_BLING_PROFILE.announcementText,
  bannerVisible: true,
  tickerText: BRITT_WITH_BLING_PROFILE.promoTickerText,
  tickerVisible: true,
  tagline: 'Where Faith Meets Fizz & Every Reveal is a VIP Experience',
  heroImageUrl: '',
  heroAnimationType: 'sparkle_rise',
  teamName: 'The Virtuous Fizzers',
  joinTeamAccessEnabled: true,
  showJoinPage: true,
  customerSiteTemplate: 'amethyst',
  appearancePreset: 'black_diamond',
  socialHandles: {
    tiktok: '@brittwithbling',
    facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
    instagram: '',
  },
}

const brittWithBlingExtras = {
  shopLink: BRITT_WITH_BLING_PROFILE.shopUrl,
  publicSiteSlug: BRITT_WITH_BLING_PROFILE.publicSiteSlug,
  streamingLinks: {
    tiktok: BRITT_WITH_BLING_PROFILE.tiktokUrl,
    facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
  },
}

function viCreateAdminClient() {
  return vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient
}

function rosterRow(overrides: Partial<JoinTeamMember> = {}): JoinTeamMember {
  return {
    id: 'member-brittany',
    repId: 'rep-britt-with-bling',
    displayName: 'Brittany',
    businessName: 'Britt with Bling',
    state: 'Florida',
    city: '',
    initials: '',
    photoUrl: BRITT_WITH_BLING_TEAM_MEMBERS[0].imageUrl ?? '',
    photoAlt: 'Brittany',
    imageClassName: '',
    bio: '',
    links: {
      tiktok: BRITT_WITH_BLING_PROFILE.tiktokUrl,
      facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
      website: 'https://bombparty.com/brittwithbling',
    },
    sortOrder: 0,
    isVisible: true,
    createdAt: '2026-06-18T12:00:00.000Z',
    updatedAt: '2026-06-18T12:00:00.000Z',
    ...overrides,
  }
}

describe('Britt With Bling hybrid public site contract', () => {
  it('keeps Beverly’s public roster portrait straight like the other team cards', () => {
    const beverly = BRITT_WITH_BLING_TEAM_MEMBERS.find(
      (member) => member.name === 'Beverly' && member.business === 'Bev with Bling',
    )

    expect(beverly?.imageClassName).toBeUndefined()
  })

  it('maps Brittany to the BWB homepage instead of a generic Sparkle shell', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      brittWithBlingSettings,
      brittWithBlingExtras,
    )

    expect(homepage.repName).toBe('Brittany')
    expect(homepage.businessName).toBe('Britt with Bling')
    expect(homepage.teamName).toBe('The Virtuous Fizzers')
    expect(homepage.heroHeadline).toBe('Britt with Bling')
    expect(homepage.heroSub).toContain('Where Faith Meets Fizz')
    expect(homepage.heroImageUrl).toBe(BRITT_WITH_BLING_PROFILE.heroImageUrl)
    expect(homepage.promoTickerText).toContain('10TH ANNIVERSARY SPECIAL')
    expect(homepage.featuredReveal).toMatchObject({
      eyebrow: 'Style Council Elite',
      title: 'The Rise of Her',
      ctaLabel: 'Shop the Luxe Layers Collection',
    })
    expect(homepage.featuredReveal?.body).toContain('Mother of Pearl')
    expect(homepage.revealExplainer?.body).toContain(
      'Experience the thrilling, must-watch excitement',
    )
    expect(homepage.aboutHeadline).toBe('What is a Bomb Party?')
    expect(homepage.aboutMediaSlots[0]?.mediaUrl).toBe(
      BRITT_WITH_BLING_PROFILE.heroImageUrl,
    )
    expect(homepage.footerTagline).toBe(
      'Britt with Bling is where faith meets fizz, community, and VIP reveals.',
    )
    expect(homepage.joinTeamUrl).toBe('/amethyst/Join.html')
    expect(homepage.footerLinks.joinTeam).toBe('/amethyst/Join.html')
    expect(homepage.footerLinks.faq).toBe('#wibp')
    expect(homepage.footerLinks).not.toHaveProperty('about')
    expect(homepage.publicSiteVariant).toBe('britt_with_bling_hybrid')
    expect(homepage.aboutMediaSlots.map((slot) => slot.caption).join(' ')).not.toMatch(
      /ask nic-nac/i,
    )
    expect(homepage.footerLinks.privacy).not.toBe('#')
    expect(homepage.footerLinks.terms).not.toBe('#')
    expect(homepage.footerLinks.accessibility).not.toBe('#')
  })

  it('keeps a configured showcase video instead of replacing it with the profile link', () => {
    const videoUrl = 'https://www.tiktok.com/@brittwithbling/video/7602795836380073229'
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      {
        ...brittWithBlingSettings,
        homepageMediaSlots: [
          { key: 'showcase', caption: '', imageUrl: '', videoUrl },
        ],
      },
      brittWithBlingExtras,
    )

    expect(homepage.showcaseVideoUrl).toBe(videoUrl)
  })

  it('lets Brittany remove the showcase video without the static fallback restoring it', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      {
        ...brittWithBlingSettings,
        homepageMediaSlots: [
          {
            key: 'showcase',
            caption: '',
            imageUrl: '',
            videoUrl: '',
            isVisible: false,
          },
        ],
      },
      brittWithBlingExtras,
    )

    expect(homepage.showcaseVideoVisible).toBe(false)
    expect(homepage.featuredReveal?.title).toBe('The Rise of Her')
  })

  it('restores Brittany About media only when she explicitly publishes the section', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      {
        ...brittWithBlingSettings,
        homepageMediaSlots: [
          {
            key: 'showcase',
            caption: '',
            imageUrl: '',
            videoUrl: BRITT_WITH_BLING_PROFILE.showcaseVideoUrl,
          },
          {
            key: 'about_1',
            caption: 'Brittany from Britt with Bling',
            imageUrl: 'https://www.yoursparklesuite.com/britt-with-bling/hero.jpeg',
            videoUrl: '',
            isVisible: true,
            sectionVisible: true,
          },
          {
            key: 'about_2',
            caption: '',
            imageUrl: '',
            videoUrl: 'https://www.tiktok.com/@brittwithbling/video/7412345678901234567',
            isVisible: true,
          },
          {
            key: 'about_3',
            caption: '',
            imageUrl: '',
            videoUrl: '',
            isVisible: false,
          },
        ],
      },
      brittWithBlingExtras,
    )

    expect(homepage.showAboutSection).toBe(true)
    expect(homepage.aboutMediaSlots[0]?.mediaUrl).toContain('/britt-with-bling/hero.jpeg')
    expect(homepage.aboutMediaSlots[1]?.href).toContain('/video/7412345678901234567')
    expect(homepage.aboutMediaSlots[2]?.href).toBe('#')
  })

  it('keeps an intentionally removed Brittany portrait removed', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      {
        ...brittWithBlingSettings,
        homepageMediaSlots: [
          {
            key: 'about_1',
            caption: '',
            imageUrl: '',
            videoUrl: '',
            isVisible: false,
            sectionVisible: true,
          },
        ],
      },
      brittWithBlingExtras,
    )

    expect(homepage.aboutMediaManaged).toBe(true)
    expect(homepage.aboutMediaSlots[0]?.mediaUrl).toBeUndefined()
    expect(homepage.showAboutSection).toBe(true)
  })

  it('keeps future Workspace Site Settings changes across the BWB public pages', () => {
    const futureSettings: SiteSettingsDashboardResult = {
      ...brittWithBlingSettings,
      displayName: 'Bri Harper',
      businessName: 'Brilliant Fizz',
      teamName: 'Radiant Circle',
      tagline: 'Every reveal shines brighter.',
      showJoinPage: false,
      aboutHeading: 'The story behind Brilliant Fizz',
      aboutNarrative:
        'First custom paragraph.\n\nSecond custom paragraph.\n\nThird custom paragraph.',
      socialHandles: {
        ...brittWithBlingSettings.socialHandles,
        tiktok: '@brilliantfizz',
      },
      homepageMediaSlots: [
        {
          key: 'showcase',
          caption: '',
          imageUrl: '',
          videoUrl: 'https://www.tiktok.com/@brilliantfizz/video/7602795836380073229',
        },
      ],
    }
    const futureExtras = {
      ...brittWithBlingExtras,
      streamingLinks: {
        ...brittWithBlingExtras.streamingLinks,
        tiktok: '',
      },
    }
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      futureSettings,
      futureExtras,
    )
    const trade = mapPreviewSettingsToTradeTemplateData(futureSettings, futureExtras)
    const join = mapPreviewSettingsToJoinTemplateData(futureSettings, futureExtras)

    expect(homepage.publicSiteVariant).toBe('britt_with_bling_hybrid')
    expect(homepage.repName).toBe('Bri')
    expect(homepage.businessName).toBe('Brilliant Fizz')
    expect(homepage.teamName).toBe('Radiant Circle')
    expect(homepage.heroEyebrow).toBe('Radiant Circle')
    expect(homepage.heroSub).toBe('Every reveal shines brighter.')
    expect(homepage.aboutHeadline).toBe('The story behind Brilliant Fizz')
    expect(homepage.aboutParagraphs).toEqual([
      'First custom paragraph.',
      'Second custom paragraph.',
      'Third custom paragraph.',
    ])
    expect(homepage.showJoinPage).toBe(false)
    expect(homepage.footerLinks.joinTeam).toBeUndefined()
    expect(homepage.showcaseVideoUrl).toContain('@brilliantfizz/video')
    expect(homepage.streamLinks.tiktok).toBe('https://www.tiktok.com/@brilliantfizz')
    expect(trade.tradeHeroTitle).toBe('Brilliant Fizz Dance Floor')
    expect(trade.tradeHeroSub).toContain('Bri')
    expect(trade.footerLinks.joinTeam).toBeUndefined()
    expect(join.heroTitle).toBe('WELCOME TO RADIANT CIRCLE')
    expect(join.heroPitch).toContain('Radiant Circle')
    expect(join.heroPitch).toContain('Bri')
    expect(join.repSocialLinks.tiktok).toBe('https://www.tiktok.com/@brilliantfizz')
  })

  it('keeps the BWB skin in a Workspace preview after future identity changes', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-britt-with-bling',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: viCreateAdminClient(),
        resolveAmethystPreviewRep: async () => ({
          id: 'rep-britt-with-bling',
          email: 'brittany@example.com',
          public_site_slug: 'brittwithbling',
          shop_link: BRITT_WITH_BLING_PROFILE.shopUrl,
          streaming_links: { tiktok: '' },
        }),
        getSiteSettingsDashboard: async () => ({
          ...brittWithBlingSettings,
          displayName: 'Bri Harper',
          businessName: 'Brilliant Fizz',
          teamName: 'Radiant Circle',
        }),
        getJoinTeamRoster: async () => [],
        getRequiredSetupState: async () => null,
      },
    })

    expect(data.homepage.publicSiteVariant).toBe('britt_with_bling_hybrid')
    expect(data.homepage.businessName).toBe('Brilliant Fizz')
    expect(data.join.heroTitle).toBe('WELCOME TO RADIANT CIRCLE')
  })

  it('serializes BWB as theme-switchable Black Diamond data', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      brittWithBlingSettings,
      brittWithBlingExtras,
    )
    const blackDiamondScript = buildAmethystHomepageBootstrapScript(
      homepage,
      [],
      'black_diamond',
    )
    const moonstoneScript = buildAmethystHomepageBootstrapScript(
      homepage,
      [],
      'moonstone',
    )

    expect(blackDiamondScript).toContain('"publicSiteVariant":"britt_with_bling_hybrid"')
    expect(blackDiamondScript).toContain('"preset":"black_diamond"')
    expect(blackDiamondScript).toContain('"bgTreatment":"black-velvet"')
    expect(moonstoneScript).toContain('"preset":"moonstone"')
    expect(moonstoneScript).toContain('"bgTreatment":"moonstone-charcoal"')

    const css = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    expect(css).toMatch(/\.bwb-below-hero-shell\s*\{[\s\S]*?background:\s*var\(--hp-bg\)/)
    expect(css).toMatch(/\.bwb-source-explainer\s*\{[\s\S]*?background:\s*var\(--hp-bg-elevated\)/)
    expect(css).toMatch(/body\.britt-with-bling\s*\{[\s\S]*?color:\s*var\(--fg\)/)
  })

  it('renders the Brittany About section conditionally and omits empty video cards', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )

    expect(source).toContain('CONTENT.showAboutSection &&')
    expect(source).toContain('<AboutSection repName={repName} hideEmptyMedia />')
    expect(source).toContain('if (hideEmptyMedia && !presentation.provider) return null;')
  })

  it('scrubs stale live queue operational copy for Brittany customers', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData(
      brittWithBlingSettings,
      brittWithBlingExtras,
    )
    const enriched = enrichAmethystHomepageFeatureData(homepage, {
      liveQueueSnapshot: {
        syncCode: 'BWB-1234',
        queue: [],
        queueLength: 0,
        currentCustomer: null,
        onDeckCustomer: null,
        lastUpdated: '2026-07-01T12:00:00.000Z',
        ageSeconds: 900,
        staleAfterSeconds: 180,
        isFresh: false,
      },
      tradeBoardListings: [],
    })

    expect(enriched.liveQueueState).toBe('delayed')
    expect(enriched.liveQueueSummary).toBe(
      'Showing the last received lineup. Positions may have changed; checking for updates.',
    )
    expect(enriched.tickerTopText).not.toContain('stale')
  })

  it('keeps Dance Floor mechanics standard while dressing it for BWB', () => {
    const trade = mapPreviewSettingsToTradeTemplateData(
      brittWithBlingSettings,
      brittWithBlingExtras,
    )

    expect(trade.businessName).toBe('Britt with Bling')
    expect(trade.repName).toBe('Brittany')
    expect(trade.tradeHeroTitle).toBe('Britt with Bling Dance Floor')
    expect(trade.tradeHeroSub).toContain('When Brittany adds available dancers')
    expect(trade.tradeHeroSub).not.toContain('standard Sparkle Suite')
    expect(trade.tradeRules).toContain('Item-for-item only.')
    expect(trade.footerLinks.home).toBe('/amethyst/Homepage.html')
    expect(trade.footerLinks.tradeBoard).toBe('/amethyst/Trade.html')
    expect(trade.footerLinks.joinTeam).toBe('/amethyst/Join.html')
    expect((trade as { publicSiteVariant?: string }).publicSiteVariant).toBe(
      'britt_with_bling_hybrid',
    )
  })

  it('uses the BWB Join Team copy and does not hardcode roster fallback data', () => {
    const join = mapPreviewSettingsToJoinTemplateData(
      brittWithBlingSettings,
      brittWithBlingExtras,
    )

    expect(join.businessName).toBe('Britt with Bling')
    expect(join.teamName).toBe('The Virtuous Fizzers')
    expect((join as { publicSiteVariant?: string }).publicSiteVariant).toBe(
      'britt_with_bling_hybrid',
    )
    expect((join as { heroTitle?: string }).heroTitle).toBe(
      'WELCOME TO THE VIRTUOUS FIZZERS',
    )
    expect(join.heroCtaText).toBe('REVIEW OFFICIAL JOIN DETAILS')
    expect(join.bpReferralUrl).toBe(BRITT_WITH_BLING_PROFILE.joinPackUrl)
    expect(join.teamMembers).toEqual([])
  })

  it('loads Nic-Nac editable roster rows into targeted BWB Join pages', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-britt-with-bling',
      publicSiteSlug: 'brittwithbling',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: viCreateAdminClient(),
        resolveAmethystPreviewRep: async () => ({
          id: 'rep-britt-with-bling',
          email: 'brittany@example.com',
          shop_link: BRITT_WITH_BLING_PROFILE.shopUrl,
          streaming_links: brittWithBlingExtras.streamingLinks,
        }),
        getSiteSettingsDashboard: async () => brittWithBlingSettings,
        getJoinTeamRoster: async () => [
          rosterRow(),
          rosterRow({
            id: 'member-lindsey',
            displayName: 'Lindsey',
            businessName: 'Mile High Fizz',
            state: 'Colorado',
            photoUrl: BRITT_WITH_BLING_TEAM_MEMBERS[3].imageUrl ?? '',
            links: {
              tiktok: 'https://www.tiktok.com/@lindze1188',
              facebook: 'https://www.facebook.com/groups/390848873287947',
              website: 'https://milehighfizz.com/',
            },
            sortOrder: 3,
          }),
        ],
        getRequiredSetupState: async () => ({
          id: 'setup-britt-with-bling',
          repId: 'rep-britt-with-bling',
          status: 'dashboard_unlocked',
          currentStep: 'final_preview_approval',
          completedSteps: [],
          steps: REQUIRED_SETUP_STEPS,
          answers: {},
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: '2026-06-18T12:00:00.000Z',
          createdAt: null,
          updatedAt: null,
          nextStep: null,
          canUnlockDashboard: true,
        }),
      },
    })

    expect(data.homepage.publicSiteVariant).toBe('britt_with_bling_hybrid')
    expect(data.homepage.footerLinks.home).toBe('/brittwithbling')
    expect(data.homepage.footerLinks.tradeBoard).toBe('/brittwithbling/trade')
    expect(data.homepage.footerLinks.joinTeam).toBe('/brittwithbling/join')
    expect(data.homepage.showcaseVideoCaption).not.toMatch(/coming soon/i)
    expect(data.homepage.footerLinks.privacy).not.toBe('#')
    expect(data.homepage.footerLinks.terms).not.toBe('#')
    expect(data.homepage.footerLinks.accessibility).not.toBe('#')
    expect(data.trade.tradeHeroSub).toContain('When Brittany adds available dancers')
    expect(data.join.footerLinks.joinTeam).toBe('/brittwithbling/join')
    expect(data.join.teamMembers).toHaveLength(2)
    expect(data.join.teamMembers[0]).toMatchObject({
      id: 'member-brittany',
      name: 'Brittany',
      business: 'Britt with Bling',
      imageUrl: BRITT_WITH_BLING_TEAM_MEMBERS[0].imageUrl,
      socialLinks: {
        tiktok: BRITT_WITH_BLING_PROFILE.tiktokUrl,
        facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
        website: 'https://bombparty.com/brittwithbling',
      },
    })
    expect(data.join.teamMembers[1].socialLinks).not.toHaveProperty('whatnot')
  })

  it('normalizes legacy Ready.ai editable roster photo URLs to migrated local assets', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-britt-with-bling',
      publicSiteSlug: 'brittwithbling',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: viCreateAdminClient(),
        resolveAmethystPreviewRep: async () => ({
          id: 'rep-britt-with-bling',
          email: 'brittany@example.com',
          shop_link: BRITT_WITH_BLING_PROFILE.shopUrl,
          streaming_links: brittWithBlingExtras.streamingLinks,
        }),
        getSiteSettingsDashboard: async () => brittWithBlingSettings,
        getJoinTeamRoster: async () => [
          rosterRow({
            photoUrl:
              'https://static.readdy.ai/image/6521ef01a44cd5c540b1d9b66db907e8/9f36b9d17474d9a7eca3dafdf020cb59.png',
          }),
        ],
        getRequiredSetupState: async () => null,
      },
    })

    expect(data.join.teamMembers[0].imageUrl).toBe(
      '/britt-with-bling/team-01-brittany.png',
    )
  })

  it('imports all Ready.ai roster cards as seed material for the BWB tenant', () => {
    expect(BRITT_WITH_BLING_TEAM_MEMBERS).toHaveLength(27)
    expect(BRITT_WITH_BLING_TEAM_MEMBERS.map((member) => member.business)).toEqual(
      expect.arrayContaining([
        'Britt with Bling',
        'Queen of Blingy Thingz',
        'Mile High Fizz',
        'Bdubbfizz',
        'Gypsy Jewels Boutique',
        'jennfizz4keeps',
        'kyndalhibbeler',
        'blingwithkrissig',
        'Bling with Sam',
        'Angies Fizz & Bling',
      ]),
    )
    expect(BRITT_WITH_BLING_TEAM_MEMBERS[0].socialLinks).toMatchObject({
      tiktok: BRITT_WITH_BLING_PROFILE.tiktokUrl,
      facebook: BRITT_WITH_BLING_PROFILE.facebookVipUrl,
      website: 'https://bombparty.com/brittwithbling',
    })
    expect(
      BRITT_WITH_BLING_TEAM_MEMBERS.some((member) =>
        JSON.stringify(member.socialLinks).toLowerCase().includes('whatnot'),
      ),
    ).toBe(false)
    expect(
      [
        BRITT_WITH_BLING_PROFILE.heroImageUrl,
        BRITT_WITH_BLING_PROFILE.joinHeroImageUrl,
        ...BRITT_WITH_BLING_TEAM_MEMBERS.map((member) => member.imageUrl ?? ''),
      ].join(' '),
    ).not.toMatch(/readdy|storage\.readdy-site/i)
  })

  it('renders BWB homepage, Dance Floor, and Join shells with BWB branding', () => {
    const homepageJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.jsx'),
      'utf8',
    )
    const homepageCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/homepage.css'),
      'utf8',
    )
    const tradeJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.jsx'),
      'utf8',
    )
    const tradeCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/trade.css'),
      'utf8',
    )
    const joinJsx = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.jsx'),
      'utf8',
    )
    const joinCss = readFileSync(
      resolve(process.cwd(), 'public/amethyst/join.css'),
      'utf8',
    )

    expect(homepageJsx).toContain('function BrittWithBlingHomepage')
    const brittPage = homepageJsx.split('function BrittWithBlingHomepage')[1].split('function BlingKitchenHomepage')[0]
    expect(brittPage).toContain('CONTENT.showAboutSection &&')
    expect(brittPage).toContain('<AboutSection repName={repName} hideEmptyMedia />')
    expect(brittPage).toContain('<BrittWithBlingRevealExplainer />')
    expect(brittPage).toContain('<Signup repName={repName} businessName={businessName} />')
    expect(homepageJsx.match(/<AboutSection repName=\{repName\} \/>/g)).toHaveLength(3)
    expect(homepageJsx).toContain('function BrittWithBlingFeaturedReveal')
    expect(homepageJsx).toContain('function BrittWithBlingRevealExplainer')
    expect(homepageJsx).toContain('<iframe')
    expect(homepageJsx).toContain('function TikTokEmbed')
    expect(homepageJsx).toContain('function SparkleSuiteHeaderStack')
    expect(homepageJsx).toContain('<SparkleSuiteHeaderStack t={t} scheduleIsLive={isLive} effectiveLrqState={queueState} onOpenQueue={onOpenQueue} />')
    expect(homepageJsx).not.toContain('bwb-header-menu')
    expect(homepageJsx).toContain('CONTENT.heroImageUrl')
    expect(homepageJsx).toContain('CONTENT.heroEyebrow || "The Virtuous Fizzers"')
    expect(homepageJsx).toContain('CONTENT.heroSub || "Where Faith Meets Fizz & Every Reveal is a VIP Experience"')
    expect(homepageJsx).toContain('CONTENT.footerLinks?.joinTeam && (')
    expect(homepageJsx).toContain(
      '<a {...linkProps(CONTENT.footerLinks.joinTeam)} className="hp-header-link">Join Team</a>',
    )
    expect(homepageJsx).not.toContain(
      'CONTENT.footerLinks?.joinTeam && <ComingSoonNavItem />',
    )
    expect(homepageJsx).toContain('bwb-featured-reveal')
    expect(homepageJsx).toContain('bwb-source-explainer')
    expect(homepageCss).toContain('body.britt-with-bling')
    expect(homepageCss).toContain('--bwb-gold: var(--hp-primary)')
    expect(homepageCss).toContain('--bwb-cyan: var(--hp-accent)')
    expect(homepageCss).toContain('overflow-x: clip')
    expect(homepageCss).toMatch(/\.bwb-hero-title\s*\{[\s\S]*?line-height:\s*1\.02;/)
    expect(homepageCss).toMatch(/\.bwb-hero-title\s*\{[\s\S]*?padding:\s*0\.04em 0\.06em 0\.1em;/)
    expect(homepageCss).toContain('.bwb-featured-video')
    expect(homepageCss).toContain('.bwb-tiktok-card')

    expect(tradeJsx).toContain('const isBrittWithBlingHybrid')
    expect(tradeJsx).toContain('bwb-trade-page')
    expect(tradeJsx).toContain('bwb-trade-board-panel')
    expect(tradeCss).toContain('body.britt-with-bling-trade')
    expect(tradeCss).toContain('--bwb-gold: var(--hp-primary)')
    expect(tradeCss).toContain('--bwb-cyan: var(--hp-accent)')
    expect(tradeCss).toContain('overflow-x: clip')
    expect(tradeCss).toContain('body.britt-with-bling-trade .tp-card')

    expect(joinJsx).toContain('const isBrittWithBlingHybrid')
    expect(joinJsx).toContain('bwb-join-page')
    expect(joinJsx).toContain('member.socialLinks?.facebook')
    expect(joinJsx).toContain('member.socialLinks?.instagram')
    expect(joinJsx).toContain('member.socialLinks?.website')
    expect(joinCss).toContain('body.britt-with-bling-join')
    expect(joinCss).toContain('--bwb-gold: var(--hp-primary)')
    expect(joinCss).toContain('--bwb-cyan: var(--hp-accent)')
    expect(joinCss).toContain('/britt-with-bling/join-hero')
    expect(joinCss).toContain('overflow-x: clip')
    expect(joinCss).toContain('.jp-team-avatar-img')
  })
})
