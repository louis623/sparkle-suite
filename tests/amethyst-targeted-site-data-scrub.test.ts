import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadAmethystHomepageUpcomingShows: vi.fn(),
  loadAmethystPreviewTemplateData: vi.fn(),
  loadAmethystTradeBoardPreviewListings: vi.fn(),
}))

vi.mock('@/lib/amethyst/homepage-upcoming-shows', async () => {
  const actual = await vi.importActual<typeof import('@/lib/amethyst/homepage-upcoming-shows')>(
    '@/lib/amethyst/homepage-upcoming-shows',
  )

  return {
    ...actual,
    loadAmethystHomepageUpcomingShows: (...args: unknown[]) =>
      mocks.loadAmethystHomepageUpcomingShows(...args),
  }
})

vi.mock('@/lib/amethyst/preview-template-data', () => ({
  loadAmethystPreviewTemplateData: (...args: unknown[]) =>
    mocks.loadAmethystPreviewTemplateData(...args),
}))

vi.mock('@/lib/amethyst/join-page-access', () => ({
  canServeTargetedAmethystJoinPage: vi.fn(async () => true),
}))

vi.mock('@/lib/amethyst/trade-board-listings', async () => {
  const actual = await vi.importActual<typeof import('@/lib/amethyst/trade-board-listings')>(
    '@/lib/amethyst/trade-board-listings',
  )

  return {
    ...actual,
    loadAmethystTradeBoardPreviewListings: (...args: unknown[]) =>
      mocks.loadAmethystTradeBoardPreviewListings(...args),
  }
})

import { GET as getStaticAsset } from '@/app/amethyst/[...asset]/route'
import { GET as getHomepageTemplate } from '@/app/api/amethyst/homepage-template/route'
import { GET as getJoinTemplate } from '@/app/api/amethyst/join-template/route'
import { GET as getTradeTemplate } from '@/app/api/amethyst/trade-template/route'

const FORBIDDEN_TARGETED_SITE_TEXT = [
  'Sparkle by Sasha',
  "Jane's Sparkle Party",
  'Sasha Rivera',
  'Clean Rep',
  'Unicorn Magic Drop',
  'Birthday Bloom Ring',
  'Velvet Hour Necklace',
  'Petal Drop Earrings',
  'Aurora Stack',
  'Jamie L.',
  'Priya M.',
  '@sparklebysasha',
  'Halloween Spook-tacular',
  'Holiday Gift Guide',
  'Year-end Sparkle',
  'Share how you got started',
  'Live Tuesdays',
  '8pm CST',
  '8:00 PM CST',
]

function expectNoDemoCustomerData(serialized: string) {
  for (const value of FORBIDDEN_TARGETED_SITE_TEXT) {
    expect(serialized).not.toContain(value)
  }
}

const cleanTemplateData = {
  appearancePreset: 'amethyst',
  homepage: {
    repName: 'Clean Rep',
    businessName: 'Clean Smoke Sparkle',
    teamName: 'Clean Smoke Team',
    tagline: 'Fresh reveals when the rep schedules them.',
    heroHeadline: 'Fresh reveals with Clean Smoke Sparkle.',
    heroSub: 'A saved Nic-Nac welcome line.',
    tickerTopText: 'Latest updates will appear here after setup.',
    aboutHeadline: 'Meet Clean Rep.',
    aboutParagraphs: [
      'A saved about paragraph.',
      'A saved community paragraph.',
      'Live show schedule coming soon.',
    ],
    aboutMediaSlots: [
      { typeLabel: 'Video', caption: 'Intro video coming soon.', href: '#' },
      { typeLabel: 'Photo', caption: 'Show photo coming soon.', href: '#' },
    ],
    signupTitle: 'Get updates.',
    signupSub: 'Sign up for show reminders from Clean Smoke Sparkle.',
    signupConsent:
      'Choose SMS, email, or both. Marketing consent stays separate from reminders and updates.',
    joinTeamTitle: 'Join Clean Smoke Team.',
    joinTeamSub: 'Team details will appear after setup.',
    joinTeamUrl: '/amethyst/Join.html?c=rep-clean',
    footerTagline: 'Clean Smoke Sparkle updates.',
    legalDisclaimer:
      'Clean Smoke Sparkle is operated by an independent Bomb Party Representative.',
    showcaseVideoCaption: 'Intro video coming soon.',
    showcaseVideoUrl: '#',
    streamLinks: {
      shop: 'https://shop.example/clean',
      watch: '#',
      tiktok: '#',
      facebook: '#',
    },
    socialLinks: [
      { label: 'TikTok', shortLabel: 'TT', href: '#' },
      { label: 'Facebook', shortLabel: 'FB', href: '#' },
      { label: 'Instagram', shortLabel: 'IG', href: '#' },
      { label: 'YouTube', shortLabel: 'YT', href: '#' },
    ],
    footerLinks: {
      tradeBoard: '/amethyst/Trade.html?c=rep-clean',
      catalog: 'https://shop.example/clean',
      preOrders: 'https://shop.example/clean',
      pastShows: '#events',
      faq: '#',
      contact: '#',
      privacy: '#',
      terms: '#',
      accessibility: '#',
    },
  },
  trade: {
    repName: 'Clean Rep',
    businessName: 'Clean Smoke Sparkle',
    tradeHeroTitle: 'Dance Floor coming soon.',
    tradeHeroSub: 'Dancers will appear after this rep adds them to the Dance Floor.',
    tickerTopText: 'Dancers will appear here after the rep adds them to the Dance Floor.',
    shopUrl: 'https://shop.example/clean',
    footerTagline: 'Clean Smoke Sparkle updates.',
    legalDisclaimer:
      'Clean Smoke Sparkle is operated by an independent Bomb Party Representative.',
    tradeRules: [
      'Item-for-item only.',
      'No pay-the-difference requests.',
      'No trade credit is issued with a Dance Floor trade.',
      'Trades are reviewed by the rep.',
    ],
    faqAnswers: {
      howTradeWorks: 'Trade details will appear when listings are added.',
      cashDifference: 'Cash differences are not supported.',
      tradeCredit: 'Trade credit is not supported.',
      matchingRules: 'The rep reviews each request.',
      rarePieces: 'Rare pieces appear only if the rep lists them.',
      responseTime: 'The rep follows up after review.',
    },
    socialLinks: [
      { label: 'TikTok', shortLabel: 'TT', href: '#' },
      { label: 'Facebook', shortLabel: 'FB', href: '#' },
      { label: 'Instagram', shortLabel: 'IG', href: '#' },
      { label: 'YouTube', shortLabel: 'YT', href: '#' },
    ],
    footerLinks: {
      home: '/amethyst/Homepage.html?c=rep-clean',
      tradeBoard: '/amethyst/Trade.html?c=rep-clean',
      joinTeam: '/amethyst/Join.html?c=rep-clean',
      catalog: 'https://shop.example/clean',
      preOrders: 'https://shop.example/clean',
      pastShows: '/amethyst/Homepage.html?c=rep-clean#events',
      faq: '#faq',
      privacy: '#faq',
      terms: '#faq',
      accessibility: '#faq',
    },
    footerColumn: {
      title: 'Trade Notes',
      links: [
        { label: 'Listings appear after setup', href: '#faq' },
        { label: 'Requests are rep reviewed', href: '#faq' },
        { label: 'Customer support stays direct', href: '#faq' },
      ],
    },
  },
  join: {
    repName: 'Clean Rep',
    repCity: 'Austin',
    repState: 'Texas',
    businessName: 'Clean Smoke Sparkle',
    teamName: 'Clean Smoke Team',
    promoText: '',
    heroPitch: 'Join details will appear after this rep configures them.',
    heroCtaText: 'See current starter packs',
    finalPitch: 'Connect with Clean Rep for the next onboarding step.',
    bpReferralUrl: 'https://shop.example/clean',
    bpIncomeDisclosureUrl: 'https://example.com/income-disclosure',
    tickerTopText: 'Team updates will appear after setup.',
    shopUrl: 'https://shop.example/clean',
    bombPartyFaqUrl: 'https://bombparty.com',
    footerTagline: 'Clean Smoke Sparkle updates.',
    legalDisclaimer:
      'Clean Smoke Sparkle is operated by an independent Bomb Party Representative.',
    repSocialLinks: {
      website: 'https://shop.example/clean',
    },
    socialLinks: [
      { label: 'TikTok', shortLabel: 'TT', href: '#' },
      { label: 'Facebook', shortLabel: 'FB', href: '#' },
      { label: 'Instagram', shortLabel: 'IG', href: '#' },
      { label: 'YouTube', shortLabel: 'YT', href: '#' },
    ],
    footerLinks: {
      tradeBoard: '/amethyst/Trade.html?c=rep-clean',
      catalog: 'https://shop.example/clean',
      preOrders: 'https://shop.example/clean',
      pastShows: '/amethyst/Homepage.html?c=rep-clean#events',
      home: '/amethyst/Homepage.html?c=rep-clean',
      joinTeam: '/amethyst/Join.html?c=rep-clean',
      faq: '#faq',
      contact: '#',
      privacy: '#faq',
      terms: '#faq',
      accessibility: '#faq',
    },
    footerColumn: {
      title: 'Team Notes',
      links: [
        { label: 'Setup coming soon', href: '#faq' },
        { label: 'Connect with the rep', href: '#faq' },
        { label: 'Review current IDS', href: '#faq' },
      ],
    },
    teamMembers: [],
    faqAnswers: {
      whatIsTeam: 'Team details will appear after setup.',
      cost: 'Review current starter pack details before joining.',
      experience: 'The rep can answer onboarding questions.',
      timeCommitment: 'The rep can discuss schedule expectations.',
      support: 'Support details will appear after setup.',
      income: 'Review the income disclosure before joining.',
    },
  },
}

const cleanCalendarEvents = [
  {
    id: 'clean-event-1',
    title: 'Eastern Host Chicago Viewer Smoke',
    description: 'Fresh live reveal with smoke-test discounts.',
    eventTime: '2026-06-07T00:00:00.000Z',
    timeZone: 'America/New_York',
    durationMinutes: 60,
    featured: true,
    codes: [{ code: 'CLEAN10', desc: '10% off smoke-test favorites' }],
    collections: [
      {
        label: 'Clean Smoke Picks',
        href: '/amethyst/Trade.html?collection=Clean%20Smoke%20Picks',
      },
    ],
    platforms: [
      {
        kind: 'tt',
        label: 'Join me on TikTok',
        href: 'https://tiktok.example/@clean',
      },
    ],
  },
]

describe('targeted Amethyst customer sites', () => {
  beforeEach(() => {
    mocks.loadAmethystPreviewTemplateData.mockReset()
    mocks.loadAmethystHomepageUpcomingShows.mockReset()
    mocks.loadAmethystTradeBoardPreviewListings.mockReset()
    mocks.loadAmethystPreviewTemplateData.mockResolvedValue(cleanTemplateData)
    mocks.loadAmethystHomepageUpcomingShows.mockImplementation((options) =>
      options?.targeted && options?.repId === 'rep-clean'
        ? []
        : [
            {
              id: 'demo-event',
              title: 'Unicorn Magic Drop',
              startsAt: '2026-06-09T20:00:00.000Z',
              durationMinutes: 90,
              timezone: 'America/Chicago',
              description: 'Demo event',
              collections: ['Unicorn Magic Drop'],
              platforms: ['TikTok'],
              ctaLabel: 'Watch live',
              ctaHref: '#',
            },
          ],
    )
    mocks.loadAmethystTradeBoardPreviewListings.mockResolvedValue([])
  })

  it('does not leak demo data in targeted homepage bootstrap data', async () => {
    const response = await getHomepageTemplate(
      new Request('https://preview.example/api/amethyst/homepage-template?c=rep-clean'),
    )
    const script = await response.text()

    expect(script).toContain('window.AMETHYST_HOMEPAGE_TEMPLATE_DATA')
    expect(script).toContain('"businessName":"Clean Smoke Sparkle"')
    expect(script).toContain('"heroSub":"A saved Nic-Nac welcome line."')
    expect(script).toContain('window.AMETHYST_HOMEPAGE_EVENTS = []')
    expectNoDemoCustomerData(script)
  })

  it('hydrates targeted homepage bootstrap data with that rep calendar events', async () => {
    mocks.loadAmethystHomepageUpcomingShows.mockResolvedValueOnce(cleanCalendarEvents)

    const response = await getHomepageTemplate(
      new Request('https://preview.example/api/amethyst/homepage-template?c=rep-clean'),
    )
    const script = await response.text()

    expect(mocks.loadAmethystHomepageUpcomingShows).toHaveBeenCalledWith({
      repId: 'rep-clean',
      targeted: true,
    })
    expect(script).toContain('window.AMETHYST_HOMEPAGE_EVENTS')
    expect(script).toContain('Eastern Host Chicago Viewer Smoke')
    expect(script).toContain('2026-06-07T00:00:00.000Z')
    expect(script).toContain('America/New_York')
    expect(script).toContain('CLEAN10')
    expect(script).toContain('Clean Smoke Picks')
    expect(script).toContain('https://tiktok.example/@clean')
    expect(script).toContain('"showEvents":true')
    expect(script).toContain('"eventCount":1')
    expectNoDemoCustomerData(script)
  })

  it('does not leak demo data in targeted trade bootstrap data', async () => {
    const response = await getTradeTemplate(
      new Request('https://preview.example/api/amethyst/trade-template?c=rep-clean'),
    )
    const script = await response.text()

    expect(script).toContain('window.AMETHYST_TRADE_BOARD_LISTINGS = []')
    expect(script).toContain('"contentState":"empty"')
    expectNoDemoCustomerData(script)
  })

  it('does not leak demo data in targeted join bootstrap data', async () => {
    const response = await getJoinTemplate(
      new Request('https://preview.example/api/amethyst/join-template?c=rep-clean'),
    )
    const script = await response.text()

    expect(script).toContain('"teamMembers":[]')
    expect(script).toContain('"showTeam":false')
    expectNoDemoCustomerData(script)
  })

  it('keeps targeted static HTML scripts, metadata, and JSON-LD scoped to the rep', async () => {
    const response = await getStaticAsset(
      new Request('https://preview.example/amethyst/Homepage.html?c=rep-clean'),
      { params: Promise.resolve({ asset: ['Homepage.html'] }) },
    )
    const html = await response.text()

    expect(html).toContain('/api/amethyst/homepage-template?c=rep-clean')
    expect(html).toContain('Clean Smoke Sparkle - Live jewelry reveals')
    expect(html).not.toContain("Jane's Sparkle Party")
    expect(html).not.toContain('repName":"Jane')
    expectNoDemoCustomerData(html)
  })
})
