import { describe, expect, it, vi } from 'vitest'

import {
  defaultAmethystHomepageTemplateData,
} from '@/lib/amethyst/homepage-template-data'
import {
  defaultAmethystTradeTemplateData,
} from '@/lib/amethyst/trade-template-data'
import {
  defaultAmethystJoinTemplateData,
} from '@/lib/amethyst/join-template-data'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'
import {
  loadAmethystPreviewTemplateData,
  mapPreviewSettingsToHomepageTemplateData,
  mapPreviewSettingsToJoinTemplateData,
  mapPreviewSettingsToTradeTemplateData,
} from '@/lib/amethyst/preview-template-data'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const demoSettings: SiteSettingsDashboardResult = {
  displayName: 'Launch Demo Rep',
  businessName: 'Sparkle Suite Demo Boutique',
  email: 'demo@example.com',
  phone: '',
  bannerText: 'Demo launch week',
  bannerVisible: true,
  tickerText: 'New demo listings added before every live show.',
  tickerVisible: true,
  tagline: 'Sparkle picks, dance floor favorites, and show-night fizz.',
  heroImageUrl: '',
  heroAnimationType: 'sparkle_rise',
  teamName: 'Sparkle Demo Circle',
  memberTeamName: 'North Star Team',
  joinTeamAccessEnabled: true,
  showJoinPage: true,
  customerSiteTemplate: 'amethyst',
  appearancePreset: 'sparkle_suite_morganite',
  socialHandles: {
    tiktok: '@sparklesuitedemo',
    instagram: '@sparklesuitedemo',
    facebook: 'sparklesuitedemo',
  },
  homepageMediaSlots: [
    {
      key: 'showcase',
      caption: 'A favorite live reveal',
      imageUrl: 'https://cdn.example.com/showcase.jpg',
      videoUrl: 'https://www.tiktok.com/@sparklesuitedemo/video/1',
    },
    {
      key: 'about_1',
      caption: 'At the show table',
      imageUrl: 'https://cdn.example.com/about-1.jpg',
      videoUrl: '',
    },
    {
      key: 'about_2',
      caption: 'Behind the scenes',
      imageUrl: '',
      videoUrl: 'https://www.tiktok.com/@sparklesuitedemo/video/2',
    },
  ],
}

it('propagates each saved visibility preference to all three customer templates', () => {
  const settings = { ...demoSettings, tickerVisible: false, danceFloorVisible: false, liveLineupVisible: false, showJoinPage: true, joinTeamAccessEnabled: false }
  for (const map of [mapPreviewSettingsToHomepageTemplateData, mapPreviewSettingsToTradeTemplateData, mapPreviewSettingsToJoinTemplateData]) {
    expect(map(settings).visibility).toEqual({ announcements: false, danceFloor: false, liveLineup: false, joinTeam: false })
  }
})

const repExtras = {
  shopLink: 'https://www.bombparty.com/shop/sparkle-suite-demo',
  streamingLinks: {
    tiktok: 'https://www.tiktok.com/@sparklesuitedemo',
    facebook: 'https://www.facebook.com/sparklesuitedemo',
    join: 'https://www.bombparty.com/shop/sparkle-suite-demo/packs',
  },
}

describe('Amethyst preview template data', () => {
  it('uses one polished demo identity when preview data cannot load', async () => {
    const data = await loadAmethystPreviewTemplateData({
      env: {},
      dependencies: {
        createAdminClient: vi.fn(),
      },
    })
    const serialized = JSON.stringify(data)

    expect(data.homepage.repName).toBe('Sasha')
    expect(data.homepage.businessName).toBe('Sparkle by Sasha')
    expect(data.trade.repName).toBe('Sasha')
    expect(data.trade.businessName).toBe('Sparkle by Sasha')
    expect(data.join.repName).toBe('Sasha')
    expect(data.join.businessName).toBe('Sparkle by Sasha')
    expect(data.join.teamName).toBe('Sparkle by Sasha')
    expect(serialized).not.toMatch(/\b(?:Rep Name|Show Name)\b/)
  })

  it('normalizes legacy placeholder demo settings to the shared demo identity', () => {
    const legacySettings: SiteSettingsDashboardResult = {
      ...demoSettings,
      displayName: 'Jane',
      businessName: "Jane's Sparkle Party",
      teamName: "Jane's Sparkle Party",
      tagline:
        "Give customers one polished place to see Jane's next live, join updates, and browse trade-friendly Sparkle Suite links.",
      bannerText: "Welcome to Jane's Sparkle Party",
      tickerText: '',
      tickerVisible: false,
    }

    const homepage = mapPreviewSettingsToHomepageTemplateData(legacySettings)
    const trade = mapPreviewSettingsToTradeTemplateData(legacySettings)
    const join = mapPreviewSettingsToJoinTemplateData(legacySettings)
    const serialized = JSON.stringify({ homepage, trade, join })

    expect(homepage.repName).toBe('Sasha')
    expect(homepage.businessName).toBe('Sparkle by Sasha')
    expect(trade.repName).toBe('Sasha')
    expect(trade.businessName).toBe('Sparkle by Sasha')
    expect(join.repName).toBe('Sasha')
    expect(join.businessName).toBe('Sparkle by Sasha')
    expect(join.teamName).toBe('Sparkle by Sasha')
    expect(serialized).not.toContain('Jane')
    expect(serialized).not.toMatch(/\b(?:Rep Name|Show Name)\b/)
  })

  it('maps connected demo settings into homepage data', () => {
    const data = mapPreviewSettingsToHomepageTemplateData(
      demoSettings,
      repExtras,
    )

    expect(data.repName).toBe('Launch')
    expect(data.businessName).toBe('Sparkle Suite Demo Boutique')
    expect(data.teamName).toBe('Sparkle Demo Circle')
    expect(data.memberTeamName).toBe('North Star Team')
    expect(data.tagline).toBe(
      'Sparkle picks, dance floor favorites, and show-night fizz.',
    )
    expect(data.heroMotion).toBe('sparkle_rise')
    expect(data.tickerTopText).toBe(
      'New demo listings added before every live show.',
    )
    expect(data.streamLinks.shop).toBe(
      'https://www.bombparty.com/shop/sparkle-suite-demo',
    )
    expect(data.streamLinks.tiktok).toBe(
      'https://www.tiktok.com/@sparklesuitedemo',
    )
    expect(data.showcaseVideoCaption).toBe('A favorite live reveal')
    expect(data.showcaseVideoUrl).toBe(
      'https://www.tiktok.com/@sparklesuitedemo/video/1',
    )
    expect(data.showcaseImageUrl).toBe('')
    expect(data.aboutMediaSlots).toEqual([
      {
        typeLabel: 'Portrait photo',
        caption: 'At the show table',
        href: '#',
        mediaUrl: 'https://cdn.example.com/about-1.jpg',
      },
      {
        typeLabel: 'Short video 1',
        caption: 'Behind the scenes',
        href: 'https://www.tiktok.com/@sparklesuitedemo/video/2',
        mediaUrl: undefined,
      },
      {
        typeLabel: 'Short video 2',
        caption: '',
        href: '#',
        mediaUrl: undefined,
      },
      {
        typeLabel: 'Short video 3',
        caption: '',
        href: '#',
        mediaUrl: undefined,
      },
    ])
    expect(data.legalDisclaimer).toContain('Sparkle Suite Demo Boutique')
  })

  it('uses the saved hero subtitle as supporting hero copy for Gnome Forest sites', () => {
    const data = mapPreviewSettingsToHomepageTemplateData({
      ...demoSettings,
      appearancePreset: 'gnome_garden',
      heroSubtitle:
        'Settle in for live reveals, friendly faces, and the joy of discovering something you love.',
    })

    expect(data.heroSub).toBe(
      'Settle in for live reveals, friendly faces, and the joy of discovering something you love.',
    )
  })

  it('maps connected demo settings into trade and join data', () => {
    const trade = mapPreviewSettingsToTradeTemplateData(
      demoSettings,
      repExtras,
    )
    const join = mapPreviewSettingsToJoinTemplateData(demoSettings, repExtras)

    expect(trade.repName).toBe('Launch')
    expect(trade.businessName).toBe('Sparkle Suite Demo Boutique')
    expect(trade.memberTeamName).toBe('North Star Team')
    expect(trade.shopUrl).toBe(
      'https://www.bombparty.com/shop/sparkle-suite-demo',
    )
    expect(trade.tickerTopText).toContain('New demo listings')
    expect(join.repName).toBe('Launch')
    expect(join.businessName).toBe('Sparkle Suite Demo Boutique')
    expect(join.teamName).toBe('Sparkle Demo Circle')
    expect(join.memberTeamName).toBe('North Star Team')
    expect(join.heroTitle).toBe('Join Sparkle Demo Circle')
    expect(join.repCity).toBe('')
    expect(join.repState).toBe('')
    expect(join.bpReferralUrl).toBe(
      'https://www.bombparty.com/shop/sparkle-suite-demo/packs',
    )
    expect(join.hasRecruitingLink).toBe(true)
    expect(join.footerLinks.contact).toBe('mailto:demo@example.com')
  })

  it('uses only an explicit recruiting or exact shop link and stays honest when neither exists', () => {
    const exactShop = mapPreviewSettingsToJoinTemplateData(demoSettings, {
      shopLink: 'https://www.bombparty.com/shop/exact-rep',
      streamingLinks: {},
    })
    const noLink = mapPreviewSettingsToJoinTemplateData(demoSettings, {
      streamingLinks: {},
    })

    expect(exactShop.bpReferralUrl).toBe(
      'https://www.bombparty.com/shop/exact-rep',
    )
    expect(exactShop.hasRecruitingLink).toBe(true)
    expect(noLink.bpReferralUrl).toBe('')
    expect(noLink.hasRecruitingLink).toBe(false)
    expect(noLink.finalPitch).toContain('not connected here yet')
    expect(noLink.faqAnswers.cost).toContain('not connected on this page yet')
  })

  it('renders only saved social profiles and supports a Whatnot handle', () => {
    const settings: SiteSettingsDashboardResult = {
      ...demoSettings,
      socialHandles: {
        instagram: '@sparklesuitedemo',
        whatnot: '@sparkle-demo',
      },
    }

    const homepage = mapPreviewSettingsToHomepageTemplateData(settings)
    const trade = mapPreviewSettingsToTradeTemplateData(settings)
    const join = mapPreviewSettingsToJoinTemplateData(settings)
    const expectedLinks = [
      {
        label: 'Instagram',
        shortLabel: 'IG',
        href: 'https://www.instagram.com/sparklesuitedemo',
      },
      {
        label: 'Whatnot',
        shortLabel: 'WN',
        href: 'https://www.whatnot.com/user/sparkle-demo',
      },
    ]

    expect(homepage.socialLinks).toEqual(expectedLinks)
    expect(trade.socialLinks).toEqual(expectedLinks)
    expect(join.socialLinks).toEqual(expectedLinks)
    expect(homepage.streamLinks.whatnot).toBe(
      'https://www.whatnot.com/user/sparkle-demo',
    )
  })

  it('maps saved TikTok and Whatnot destinations independently for hero actions', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData({
      ...demoSettings,
      socialHandles: {
        tiktok: '@sparklesuitedemo',
        whatnot: '@sparkle-demo',
      },
    })

    expect(homepage.streamLinks.tiktok).toBe(
      'https://www.tiktok.com/@sparklesuitedemo',
    )
    expect(homepage.streamLinks.whatnot).toBe(
      'https://www.whatnot.com/user/sparkle-demo',
    )
  })

  it('uses the saved About narrative without adding default filler copy', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData({
      ...demoSettings,
      aboutNarrative: 'I love bringing surprise and connection to every live show.\n\nCome hang out, find a favorite, and make some sparkle-filled memories.',
    })

    expect(homepage.aboutParagraphs).toEqual([
      'I love bringing surprise and connection to every live show.',
      'Come hang out, find a favorite, and make some sparkle-filled memories.',
      '',
    ])
  })

  it('maps saved About heading and subheading with the narrative', () => {
    const homepage = mapPreviewSettingsToHomepageTemplateData({
      ...demoSettings,
      aboutHeading: 'Meet Heather',
      aboutSubheading: 'HEATHER DAUGHERTY · OHIO',
      aboutNarrative: 'First paragraph.\n\nSecond paragraph.',
    })

    expect(homepage.aboutHeadline).toBe('Meet Heather')
    expect(homepage.aboutSubheading).toBe('HEATHER DAUGHERTY · OHIO')
    expect(homepage.aboutParagraphs).toEqual([
      'First paragraph.',
      'Second paragraph.',
      '',
    ])
  })

  it('hides Join Team customer links when the rep has not launched that page', () => {
    const settings: SiteSettingsDashboardResult = {
      ...demoSettings,
      showJoinPage: false,
    }

    const homepage = mapPreviewSettingsToHomepageTemplateData(settings, repExtras)
    const trade = mapPreviewSettingsToTradeTemplateData(settings, repExtras)

    expect(homepage.showJoinPage).toBe(false)
    expect(homepage.joinTeamUrl).toBe('')
    expect(homepage.footerLinks.joinTeam).toBeUndefined()
    expect(trade.footerLinks.joinTeam).toBeUndefined()
  })

  it('keeps Join Team hidden until an operator grants early access', () => {
    const settings: SiteSettingsDashboardResult = {
      ...demoSettings,
      joinTeamAccessEnabled: false,
      showJoinPage: true,
    }

    const homepage = mapPreviewSettingsToHomepageTemplateData(settings, repExtras)
    const trade = mapPreviewSettingsToTradeTemplateData(settings, repExtras)

    expect(homepage.showJoinPage).toBe(false)
    expect(homepage.joinTeamUrl).toBe('')
    expect(homepage.footerLinks.joinTeam).toBeUndefined()
    expect(trade.footerLinks.joinTeam).toBeUndefined()
  })

  it('returns defaults when Supabase env is missing', async () => {
    const data = await loadAmethystPreviewTemplateData({
      env: {},
      dependencies: {
        createAdminClient: vi.fn(),
      },
    })

    expect(data.appearancePreset).toBe('sparkle_suite_morganite')
    expect(data.homepage).toBe(defaultAmethystHomepageTemplateData)
    expect(data.trade).toBe(defaultAmethystTradeTemplateData)
    expect(data.join).toBe(defaultAmethystJoinTemplateData)
  })

  it('passes an explicit customer rep target into the resolver', async () => {
    const createAdminClientMock = vi.fn(() => ({ from: vi.fn() }))
    const resolveAmethystPreviewRep = vi.fn(async () => ({
      id: 'rep-target',
      email: 'target@example.com',
      shop_link: 'https://example.com/shop',
      streaming_links: {},
    }))
    const getSiteSettingsDashboard = vi.fn(async () => demoSettings)

    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-target',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient:
          createAdminClientMock as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep,
        getSiteSettingsDashboard,
      },
    })

    expect(resolveAmethystPreviewRep).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        repId: 'rep-target',
        select: 'id, email, shop_link, streaming_links, public_site_slug',
      }),
    )
    expect(data.homepage.joinTeamUrl).toBe('/amethyst/Join.html?c=rep-target')
    expect(data.homepage.footerLinks.tradeBoard).toBe(
      '/amethyst/Trade.html?c=rep-target',
    )
    expect(data.appearancePreset).toBe('sparkle_suite_morganite')
    expect(data.trade.footerLinks.home).toBe(
      '/amethyst/Homepage.html?c=rep-target',
    )
    expect(data.join.footerLinks.tradeBoard).toBe(
      '/amethyst/Trade.html?c=rep-target',
    )
  })

  it('replaces a mismatched demo team name with the owning rep identity', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-kim',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient:
          vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => ({
          id: 'rep-kim',
          email: 'kim@example.com',
          shop_link: 'https://example.com/shop',
          streaming_links: {},
          public_site_slug: 'goforthebling',
        })),
        getSiteSettingsDashboard: vi.fn(async () => ({
          ...demoSettings,
          displayName: 'Kim',
          businessName: 'GofortheBling',
          teamName: 'Sparkle by Sasha',
        })),
        getJoinTeamRoster: vi.fn(async () => []),
      },
    })

    expect(data.join.teamName).toBe('GofortheBling')
    expect(data.join.heroTitle).toBe('Join GofortheBling')
    expect(data.join.heroPitch).toContain('join GofortheBling with Kim')
    expect(data.join.finalPitch).toContain('connect with Kim')
    expect(data.join.promoText).toBe('')
    expect(JSON.stringify(data.join.faqAnswers)).not.toContain('Sasha')
  })

  it('keeps Join Team hidden after applying a customer target', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-hidden-join',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient:
          vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => ({
          id: 'rep-hidden-join',
          email: 'hidden-join@example.com',
          shop_link: null,
          streaming_links: {},
        })),
        getSiteSettingsDashboard: vi.fn(async () => ({
          ...demoSettings,
          showJoinPage: false,
        })),
      },
    })

    expect(data.homepage.joinTeamUrl).toBe('')
    expect(data.homepage.footerLinks.joinTeam).toBeUndefined()
    expect(data.trade.footerLinks.joinTeam).toBeUndefined()
  })

  it('overlays required setup draft copy onto the targeted customer-site preview', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-gracie',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => ({
          id: 'rep-gracie',
          email: 'smoke.rep@example.com',
          shop_link: null,
          streaming_links: {},
        })),
        getSiteSettingsDashboard: vi.fn(async () => ({
          ...demoSettings,
          displayName: 'Gracie Smoke',
          businessName: 'Gracie Smoke',
          bannerText: 'Welcome to Gracie Smoke',
          tagline: 'A polished place to shop Gracie Smoke.',
          teamName: "Gracie's Team",
        })),
        getRequiredSetupState: vi.fn(async () => ({
          id: 'setup-gracie',
          repId: 'rep-gracie',
          status: 'required_setup',
          currentStep: 'final_preview_approval',
          completedSteps: [],
          steps: [],
          answers: {
            account_basics: {
              conversationName: 'Gracie Smoke',
              customerFacingDisplayName: "Gracie's Sparkle Party",
              liveShowName: "Gracie's Sparkle Party Live",
              bestContactEmail: 'smoke.rep@example.com',
              bombPartyRepStoreLink: 'https://bombparty.com/graciesmoke',
              primaryLiveShowOrSocialLink:
                'https://www.tiktok.com/@graciessparkleparty',
            },
            site_skin: {
              selectedLookCode: 'RQ-01',
            },
            welcome_copy: {
              headline: "Welcome to Gracie's Sparkle Party.",
              supportingLine:
                'Join me for fun jewelry reveals, friendly live shows, and sparkle you can shop anytime.',
            },
            about_page: {
              selectedAboutCopy:
                "Welcome to Gracie's Sparkle Party. I believe jewelry should make you smile, and every customer should feel seen.",
            },
            show_schedule: {
              scheduleSummary:
                'Tuesdays and Thursdays at 7 PM Mountain Time, with occasional Saturday pop-up shows announced on TikTok.',
            },
          },
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: null,
          createdAt: '2026-06-04T18:00:00Z',
          updatedAt: '2026-06-04T18:30:00Z',
          nextStep: 'final_preview_approval',
          canUnlockDashboard: false,
        })),
      },
    })

    expect(data.appearancePreset).toBe('rose_quartz')
    expect(data.homepage.businessName).toBe("Gracie's Sparkle Party")
    expect(data.homepage.teamName).toBe("Gracie's Team")
    expect(data.homepage.heroHeadline).toBe("Welcome to Gracie's Sparkle Party.")
    expect(data.homepage.heroSub).toBe(
      'Join me for fun jewelry reveals, friendly live shows, and sparkle you can shop anytime.',
    )
    expect(data.homepage.aboutParagraphs[0]).toContain(
      "Welcome to Gracie's Sparkle Party",
    )
    expect(data.homepage.aboutParagraphs[2]).toContain(
      'Tuesdays and Thursdays at 7 PM Mountain Time',
    )
    expect(data.homepage.streamLinks.shop).toBe(
      'https://bombparty.com/graciesmoke',
    )
    expect(data.homepage.streamLinks.tiktok).toBe(
      'https://www.tiktok.com/@graciessparkleparty',
    )
    expect(JSON.stringify(data.homepage)).not.toContain('A polished place to shop Gracie Smoke.')
  })

  it('maps Nic-Nac welcome subheadline and schedule answer aliases into preview data', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-aliases',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => ({
          id: 'rep-aliases',
          email: 'aliases@example.com',
          shop_link: null,
          streaming_links: {},
        })),
        getSiteSettingsDashboard: vi.fn(async () => ({
          ...demoSettings,
          displayName: 'Alias Smoke',
          businessName: 'Alias Smoke Sparkle',
          teamName: 'Alias Smoke Sparkle',
        })),
        getRequiredSetupState: vi.fn(async () => ({
          id: 'setup-aliases',
          repId: 'rep-aliases',
          status: 'required_setup',
          currentStep: 'final_preview_approval',
          completedSteps: [],
          steps: [],
          answers: {
            welcome_copy: {
              subheadline: 'The exact saved subheadline.',
            },
            show_schedule: {
              answer: 'The exact saved schedule.',
            },
          },
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: null,
          createdAt: null,
          updatedAt: null,
          nextStep: 'final_preview_approval',
          canUnlockDashboard: false,
        })),
      },
    })

    expect(data.homepage.heroSub).toBe('The exact saved subheadline.')
    expect(data.homepage.aboutParagraphs[2]).toContain(
      'The exact saved schedule.',
    )
  })

  it.each(AMETHYST_APPEARANCE_PRESET_IDS)(
    'keeps required setup copy and applies the %s customer-facing Look',
    async (appearancePreset) => {
      const data = await loadAmethystPreviewTemplateData({
        repId: `rep-${appearancePreset}`,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        },
        dependencies: {
          createAdminClient: vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
          resolveAmethystPreviewRep: vi.fn(async () => ({
            id: `rep-${appearancePreset}`,
            email: `${appearancePreset}@example.com`,
            shop_link: null,
            streaming_links: {},
          })),
          getSiteSettingsDashboard: vi.fn(async () => ({
            ...demoSettings,
            appearancePreset,
          })),
          getRequiredSetupState: vi.fn(async () => ({
            id: `setup-${appearancePreset}`,
            repId: `rep-${appearancePreset}`,
            status: 'required_setup',
            currentStep: 'final_preview_approval',
            completedSteps: [],
            steps: [],
            answers: {
              account_basics: {
                customerFacingDisplayName: 'Every Look Sparkle',
              },
              welcome_copy: {
                headline: 'Every Look gets the same Nic-Nac copy.',
                supportingLine:
                'The saved setup content stays independent from old Look data.',
              },
              site_skin: {
                selectedLook: appearancePreset,
              },
            },
            generatedCopy: {},
            supportState: {},
            dashboardUnlockedAt: null,
            createdAt: null,
            updatedAt: null,
            nextStep: 'final_preview_approval',
            canUnlockDashboard: false,
          })),
        },
      })

      expect(data.appearancePreset).toBe(appearancePreset)
      expect(data.homepage.businessName).toBe('Every Look Sparkle')
      expect(data.homepage.heroHeadline).toBe(
        'Every Look gets the same Nic-Nac copy.',
      )
      expect(data.homepage.heroSub).toBe(
        'The saved setup content stays independent from old Look data.',
      )
    },
  )

  it('keeps the saved customer-facing Look when a partial setup draft has no theme confirmation yet', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-partial-look',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => ({
          id: 'rep-partial-look',
          email: 'partial@example.com',
          shop_link: null,
          streaming_links: {},
        })),
        getSiteSettingsDashboard: vi.fn(async () => ({
          ...demoSettings,
          appearancePreset: 'black_diamond',
        })),
        getRequiredSetupState: vi.fn(async () => ({
          id: 'setup-partial-look',
          repId: 'rep-partial-look',
          status: 'required_setup',
          currentStep: 'welcome_copy',
          completedSteps: [],
          steps: [],
          answers: {
            account_basics: {
              customerFacingDisplayName: 'Partial Look Sparkle',
            },
            welcome_copy: {
              headline: 'Partial drafts should not reset the Look.',
            },
          },
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: null,
          createdAt: null,
          updatedAt: null,
          nextStep: 'site_skin',
          canUnlockDashboard: false,
        })),
      },
    })

    expect(data.appearancePreset).toBe('black_diamond')
    expect(data.homepage.businessName).toBe('Partial Look Sparkle')
    expect(data.homepage.heroHeadline).toBe(
      'Partial drafts should not reset the Look.',
    )
  })

  it('uses saved site settings after dashboard unlock instead of stale setup skin answers', async () => {
    const data = await loadAmethystPreviewTemplateData({
      repId: 'rep-unlocked-stale-look',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: vi.fn(() => ({ from: vi.fn() })) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => ({
          id: 'rep-unlocked-stale-look',
          email: 'unlocked@example.com',
          shop_link: null,
          streaming_links: {},
        })),
        getSiteSettingsDashboard: vi.fn(async () => ({
          ...demoSettings,
          displayName: 'Unlocked Rep',
          businessName: 'Unlocked Sparkle',
          teamName: 'Unlocked Sparkle',
          tagline: 'The saved workspace tagline.',
          appearancePreset: 'amber',
        })),
        getRequiredSetupState: vi.fn(async () => ({
          id: 'setup-unlocked-stale-look',
          repId: 'rep-unlocked-stale-look',
          status: 'dashboard_unlocked',
          currentStep: 'final_preview_approval',
          completedSteps: [],
          steps: [],
          answers: {
            account_basics: {
              customerFacingDisplayName: 'Old Setup Sparkle',
            },
            site_skin: {
              selectedLook: 'AM-01',
              selectedLookName: 'Original Sparkle Look (Amethyst)',
            },
            welcome_copy: {
              headline: 'Old setup headline.',
            },
          },
          generatedCopy: {},
          supportState: {},
          dashboardUnlockedAt: '2026-06-08T21:11:33.698Z',
          createdAt: null,
          updatedAt: null,
          nextStep: null,
          canUnlockDashboard: true,
        })),
      },
    })

    expect(data.appearancePreset).toBe('amber')
    expect(data.homepage.businessName).toBe('Unlocked Sparkle')
    expect(data.homepage.heroHeadline).not.toBe('Old setup headline.')
  })

  it('falls back to defaults when lookup fails', async () => {
    const data = await loadAmethystPreviewTemplateData({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      dependencies: {
        createAdminClient: vi.fn(() => ({})) as unknown as typeof createAdminClient,
        resolveAmethystPreviewRep: vi.fn(async () => {
          throw new Error('lookup failed')
        }),
      },
    })

    expect(data.appearancePreset).toBe('sparkle_suite_morganite')
    expect(data.homepage).toBe(defaultAmethystHomepageTemplateData)
    expect(data.trade).toBe(defaultAmethystTradeTemplateData)
    expect(data.join).toBe(defaultAmethystJoinTemplateData)
  })
})
