import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mapPreviewSettingsToHomepageTemplateData,
  mapPreviewSettingsToJoinTemplateData,
  mapPreviewSettingsToTradeTemplateData,
} from '@/lib/amethyst/preview-template-data'
import type { AmethystJoinTeamMember } from '@/lib/amethyst/join-template-data'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'
import {
  buildJoinPageIndexCopy,
  extractScheduleFromText,
} from '@/lib/amethyst/join-page-index-copy'
import { renderPublicPageIndexBlock } from '@/lib/amethyst/public-page-index-html'
import { applyPublicJoinIndex } from '@/lib/amethyst/public-join-index'

const { loadTemplateMock, resolveSiteMock } = vi.hoisted(() => ({
  loadTemplateMock: vi.fn(),
  resolveSiteMock: vi.fn(),
}))

vi.mock('@/lib/amethyst/preview-template-data', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/amethyst/preview-template-data')
  >('@/lib/amethyst/preview-template-data')
  return {
    ...actual,
    loadAmethystPreviewTemplateData: (...args: unknown[]) =>
      loadTemplateMock(...args),
  }
})

vi.mock('@/lib/amethyst/customer-domain-site', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/amethyst/customer-domain-site')
  >('@/lib/amethyst/customer-domain-site')
  return {
    ...actual,
    resolveCustomerDomainSiteState: (...args: unknown[]) =>
      resolveSiteMock(...args),
  }
})

vi.mock('@/lib/amethyst/join-page-access', () => ({
  canServeTargetedAmethystJoinPage: vi.fn(async () => true),
}))

import { GET } from '@/app/customer-site/[page]/route'

const BANNED_COPY = /\b(she|her|hers|he|him|his|they|them|their|theirs|trade|commission|commissions|earnings|income)\b|Live Queue|\$\d/i

function settings(
  overrides: Partial<SiteSettingsDashboardResult>,
): SiteSettingsDashboardResult {
  return {
    displayName: 'Rep',
    businessName: 'Show',
    email: 'rep@example.com',
    phone: '',
    bannerText: '',
    bannerVisible: false,
    tickerText: '',
    tickerVisible: true,
    tagline: 'Live jewelry reveals',
    heroImageUrl: '',
    heroAnimationType: 'sparkle_rise',
    teamName: 'Team',
    joinTeamAccessEnabled: true,
    showJoinPage: true,
    customerSiteTemplate: 'amethyst',
    appearancePreset: 'amethyst',
    socialHandles: {},
    ...overrides,
  }
}

function templateFor(
  siteSettings: SiteSettingsDashboardResult,
  members: AmethystJoinTeamMember[] = [],
) {
  const extras = { shopLink: 'https://example.com/shop', streamingLinks: {} }
  return {
    appearancePreset: 'amethyst' as const,
    homepage: mapPreviewSettingsToHomepageTemplateData(siteSettings, extras),
    trade: mapPreviewSettingsToTradeTemplateData(siteSettings, extras),
    join: mapPreviewSettingsToJoinTemplateData(siteSettings, extras, members),
  }
}

function field(html: string, pattern: RegExp) {
  return html.match(pattern)?.[1] ?? ''
}

describe('rep /join server HTML', () => {
  const mileHigh = templateFor(
    settings({
      displayName: 'Lindsey',
      businessName: 'Mile High Fizz',
      teamName: 'Diamond Peak Society',
      tickerText: 'Live on Tiktok Tues/Thurs/Sat',
    }),
  )
  const glowtique = templateFor(
    settings({
      displayName: 'Brianna',
      businessName: "Bri's Glowtique",
      teamName: 'Team Sparkaholics',
      aboutNarrative:
        "Bri's Glowtique is a studio for live jewelry reveals and a calm place to learn the business.",
      tickerText: 'Live jewelry reveals. Follow the show for times.',
    }),
    [
      {
        name: 'Brianna',
        business: "Bri's Glowtique",
        state: 'Wichita, Kansas',
        bio: 'New teammates get a weekly planning call and help preparing a first live show.',
        isVisible: true,
        socialLinks: {},
      },
    ],
  )

  beforeEach(() => {
    loadTemplateMock.mockReset()
    resolveSiteMock.mockReset()
    loadTemplateMock.mockImplementation(async (options: { repId?: string }) =>
      options.repId === 'rep-bri' ? glowtique : mileHigh,
    )
    resolveSiteMock.mockImplementation(async (host: string) => {
      const value = String(host)
      if (value.includes('brisglowtique')) {
        return { kind: 'serve', host: 'brisglowtique.com', repId: 'rep-bri' }
      }
      return { kind: 'serve', host: 'milehighfizz.com', repId: 'rep-mile' }
    })
  })

  it('renders different titles, headings, descriptions, and canonicals for two reps', async () => {
    const mileResponse = await GET(
      new Request('https://milehighfizz.com/customer-site/join'),
      { params: Promise.resolve({ page: 'join' }) },
    )
    const glowResponse = await GET(
      new Request('https://brisglowtique.com/customer-site/join'),
      { params: Promise.resolve({ page: 'join' }) },
    )

    expect(mileResponse.status).toBe(200)
    expect(glowResponse.status).toBe(200)
    const mileHtml = await mileResponse.text()
    const glowHtml = await glowResponse.text()

    const mile = {
      title: field(mileHtml, /<title>(.*?)<\/title>/),
      h1: field(mileHtml, /<h1>(.*?)<\/h1>/),
      description: field(mileHtml, /<meta name="description" content="(.*?)"/),
      canonical: field(mileHtml, /<link rel="canonical" href="(.*?)"/),
      ogUrl: field(mileHtml, /<meta property="og:url" content="(.*?)"/),
    }
    const glow = {
      title: field(glowHtml, /<title>(.*?)<\/title>/),
      h1: field(glowHtml, /<h1>(.*?)<\/h1>/),
      description: field(glowHtml, /<meta name="description" content="(.*?)"/),
      canonical: field(glowHtml, /<link rel="canonical" href="(.*?)"/),
      ogUrl: field(glowHtml, /<meta property="og:url" content="(.*?)"/),
    }

    expect(mile.title).not.toBe(glow.title)
    expect(mile.h1).not.toBe(glow.h1)
    expect(mile.description).not.toBe(glow.description)
    expect(mile.canonical).not.toBe(glow.canonical)

    expect(mile.title).toBe(
      'Mile High Fizz — Join Diamond Peak Society',
    )
    expect(mile.h1).toBe(
      'Join Diamond Peak Society with Mile High Fizz',
    )
    expect(mile.description).toContain('Mile High Fizz')
    expect(mile.description).not.toMatch(/\bin\b/)
    expect(mile.description).toContain('Tuesdays, Thursdays, and Saturdays')
    expect(mile.canonical).toBe('https://milehighfizz.com/join')
    expect(mile.ogUrl).toBe(mile.canonical)

    expect(glow.title).toBe(
      "Bri's Glowtique in Wichita, Kansas — Join Team Sparkaholics",
    )
    expect(glow.h1).toBe(
      "Join Team Sparkaholics with Bri's Glowtique in Wichita, Kansas",
    )
    expect(glow.description).toContain("Bri's Glowtique in Wichita, Kansas")
    expect(glow.description).toContain('studio for live jewelry reveals')
    expect(glow.canonical).toBe('https://brisglowtique.com/join')
    expect(glow.ogUrl).toBe(glow.canonical)

    expect(mileHtml).toContain('hosts live jewelry reveals on Tuesdays, Thursdays, and Saturdays')
    expect(glowHtml).toContain('a calm place to learn the business')
    expect(mileHtml).toContain('Team leader: Mile High Fizz.')
    expect(glowHtml).toContain("Team leader: Bri's Glowtique.")
    expect(glowHtml).toContain(
      'How the rep supports new teammates: New teammates get a weekly planning call and help preparing a first live show.',
    )
    expect(mileHtml).not.toContain('How the rep supports new teammates')

    for (const html of [mileHtml, glowHtml]) {
      expect(html).toContain('<meta name="robots" content="index,follow"')
      expect(html.toLowerCase()).not.toContain('noindex')
    }
    for (const value of [mile.title, mile.h1, mile.description, glow.title, glow.h1, glow.description]) {
      expect(value).not.toMatch(BANNED_COPY)
    }
    const mileIntro = field(mileHtml, /<main class="join-index"><h1>.*?<\/h1><p>(.*?)<\/p>/)
    expect(mileIntro).not.toMatch(BANNED_COPY)
    expect(mileHtml).toContain('Lindsey is the rep for Mile High Fizz.')
    expect(mileHtml).not.toContain('Littleton')
    expect(glowHtml).toContain("Brianna is the rep for Bri's Glowtique in Wichita, Kansas.")
    expect(mileHtml).toContain('Live shows run Tuesdays, Thursdays, and Saturdays.')
  })

  it('server-renders homepage and dance floor copy while leaving Live Lineup to the client', async () => {
    const mileHome = await GET(
      new Request('https://milehighfizz.com/customer-site/home'),
      { params: Promise.resolve({ page: 'home' }) },
    )
    const glowHome = await GET(
      new Request('https://brisglowtique.com/customer-site/home'),
      { params: Promise.resolve({ page: 'home' }) },
    )
    const mileFloor = await GET(
      new Request('https://milehighfizz.com/customer-site/trade'),
      { params: Promise.resolve({ page: 'trade' }) },
    )
    const glowPantry = await GET(
      new Request('https://brisglowtique.com/customer-site/in-the-pantry'),
      { params: Promise.resolve({ page: 'in-the-pantry' }) },
    )

    const mileHomeHtml = await mileHome.text()
    const glowHomeHtml = await glowHome.text()
    const mileFloorHtml = await mileFloor.text()
    const glowPantryHtml = await glowPantry.text()

    expect(field(mileHomeHtml, /<h1>(.*?)<\/h1>/)).toBe('Mile High Fizz')
    expect(mileHomeHtml).toContain('Lindsey is the rep for Mile High Fizz.')
    expect(mileHomeHtml).toContain(
      'Mile High Fizz hosts live jewelry reveals on Tuesdays, Thursdays, and Saturdays.',
    )
    expect(mileHomeHtml).toContain('Live shows run Tuesdays, Thursdays, and Saturdays.')
    expect(field(glowHomeHtml, /<h1>(.*?)<\/h1>/)).toBe(
      "Bri's Glowtique in Wichita, Kansas",
    )
    expect(glowHomeHtml).toContain('Brianna is the rep for')
    expect(glowHomeHtml).toContain('a calm place to learn the business')
    expect(mileHomeHtml).not.toBe(glowHomeHtml)

    expect(field(mileFloorHtml, /<h1>(.*?)<\/h1>/)).toBe('Mile High Fizz Dance Floor')
    expect(mileFloorHtml).toContain('one-for-one dancer swap')
    expect(mileFloorHtml).toContain('Lindsey is the rep for Mile High Fizz.')
    expect(mileFloorHtml).not.toContain('Littleton')
    expect(field(glowPantryHtml, /<h1>(.*?)<\/h1>/)).toBe(
      "In the Pantry with Bri's Glowtique in Wichita, Kansas",
    )
    expect(glowPantryHtml).toContain('Recipes will appear here after the rep adds the first one.')

    for (const html of [mileHomeHtml, mileFloorHtml]) {
      expect(html).toContain('live-lineup.js')
      expect(html).not.toContain('Live Queue')
      const block = field(html, /(<main class="(?:public|join)-index">[\s\S]*?<\/main>)/)
      expect(block).not.toMatch(BANNED_COPY)
      expect(block).not.toContain('hp-queue')
    }

    const beforeHome = serverText(readPublicHtml('Homepage.html'))
    const beforeJoin = serverText(readPublicHtml('Join.html'))
    const afterHome = serverText(mileHomeHtml)
    const mileJoin = await GET(
      new Request('https://milehighfizz.com/customer-site/join'),
      { params: Promise.resolve({ page: 'join' }) },
    )
    const afterJoin = serverText(await mileJoin.text())

    expect(afterHome.length).toBeGreaterThan(beforeHome.length)
    expect(afterJoin.length).toBeGreaterThan(beforeJoin.length)
    expect(wordCount(afterHome)).toBeGreaterThan(wordCount(beforeHome))
    expect(wordCount(afterJoin)).toBeGreaterThan(wordCount(beforeJoin))
    expect(wordCount(beforeHome)).toBeLessThan(40)
    expect(wordCount(beforeJoin)).toBeLessThan(40)
    expect(wordCount(afterHome)).toBeGreaterThan(40)
    expect(wordCount(afterJoin)).toBeGreaterThan(60)
  })

  it('keeps a skin join heading and writes a unique title without a fallback place', async () => {
    loadTemplateMock.mockResolvedValue(
      templateFor(
        settings({
          displayName: 'Lindsey',
          businessName: 'Mile High Fizz',
          email: 'lindseychapman1188@gmail.com',
          teamName: 'Diamond Peak Society',
          appearancePreset: 'alpine_opal',
          tickerText: 'Live on Tiktok Tues/Thurs/Sat',
        }),
      ),
    )
    const response = await GET(
      new Request('https://milehighfizz.com/customer-site/join'),
      { params: Promise.resolve({ page: 'join' }) },
    )
    const html = await response.text()

    expect(field(html, /<h1>(.*?)<\/h1>/)).toBe(
      'Welcome to the Diamond Peak Society',
    )
    expect(field(html, /<title>(.*?)<\/title>/)).toBe(
      'Mile High Fizz — Join Diamond Peak Society',
    )
    expect(field(html, /<meta name="description" content="(.*?)"/)).toContain(
      'Mile High Fizz',
    )
    expect(html).toContain('official requirements')
    expect(html).not.toContain('Littleton')
    expect(html).not.toMatch(/\b\d{5}(?:-\d{4})?\b/)
  })
})

function readPublicHtml(fileName: string) {
  return readFileSync(resolve(process.cwd(), 'public/amethyst', fileName), 'utf8')
}

function serverText(html: string) {
  const withoutCode = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const title = withoutCode.match(/<title>(.*?)<\/title>/)?.[1] ?? ''
  const description =
    withoutCode.match(/<meta name="description" content="(.*?)"/)?.[1] ?? ''
  const body = withoutCode.split(/<body[^>]*>/i)[1]?.split(/<\/body>/i)[0] ?? ''
  return `${title} ${description} ${body.replace(/<[^>]+>/g, ' ')}`
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length
}

describe('public page index copy', () => {
  it('puts pantry recipe titles in the initial HTML and drops banned sentences', () => {
    const html = renderPublicPageIndexBlock('pantry', applyPublicJoinIndex(glowtiqueTemplate()), [
      {
        title: 'Peach tea',
        description: 'A cold pitcher for show night. She serves it between reveals.',
      },
      { title: 'Lemon bars', description: 'A shortbread pan for the team table.' },
    ])

    expect(html).toContain('<h2>Peach tea</h2>')
    expect(html).toContain('<h2>Lemon bars</h2>')
    expect(html).toContain('A shortbread pan for the team table.')
    expect(html).not.toContain('She serves')
    expect(html).not.toMatch(BANNED_COPY)
    expect(html).toContain("Brianna is the rep for Bri's Glowtique in Wichita, Kansas.")
  })
})

function glowtiqueTemplate() {
  return templateFor(
    settings({
      displayName: 'Brianna',
      businessName: "Bri's Glowtique",
      teamName: 'Team Sparkaholics',
      aboutNarrative:
        "Bri's Glowtique is a studio for live jewelry reveals and a calm place to learn the business.",
    }),
    [
      {
        name: 'Brianna',
        business: "Bri's Glowtique",
        state: 'Wichita, Kansas',
        bio: 'New teammates get a weekly planning call and help preparing a first live show.',
        isVisible: true,
        socialLinks: {},
      },
    ],
  )
}

describe('join page index copy', () => {
  it('changes the sentence when the available facts change and stays stable', () => {
    const withSchedule = buildJoinPageIndexCopy({
      businessName: 'North Glow',
      teamName: 'North Glow',
      city: 'Austin',
      state: 'Texas',
      tickerText: 'Live Tuesdays at 8:00 PM CT',
    })
    const withoutSchedule = buildJoinPageIndexCopy({
      businessName: 'North Glow',
      teamName: 'North Glow',
      city: 'Austin',
      state: 'Texas',
    })
    const again = buildJoinPageIndexCopy({
      businessName: 'North Glow',
      teamName: 'North Glow',
      city: 'Austin',
      state: 'Texas',
      tickerText: 'Live Tuesdays at 8:00 PM CT',
    })

    expect(withSchedule.intro).not.toBe(withoutSchedule.intro)
    expect(withSchedule.intro).toBe(again.intro)
    expect(withSchedule.intro).toContain('Austin, Texas')
    expect(withSchedule.intro).toContain('Tuesdays at 8:00 PM CT')
    expect(withSchedule.location).toBe('Austin, Texas')
    expect(formatStreet()).toBe('Denver, Colorado')
    expect(formatSuiteAndZip()).toBe('Orlando, Florida')
    expect(
      buildJoinPageIndexCopy({
        businessName: 'Mile High Fizz',
        teamName: 'Diamond Peak Society',
        tickerText: 'Live on Tiktok Tues/Thurs/Sat',
      }).title,
    ).toBe('Mile High Fizz — Join Diamond Peak Society')
  })

  it('reads a slash-style show schedule without copying the rest of the ticker', () => {
    expect(extractScheduleFromText('Live on Tiktok Tues/Thurs/Sat')).toBe(
      'Tuesdays, Thursdays, and Saturdays',
    )
    expect(extractScheduleFromText('LIVE M/W/F AT 7:00PM EST')).toBe(
      'Mondays, Wednesdays, and Fridays at 7:00 PM EST',
    )
    expect(
      extractScheduleFromText(
        'Live tonight - 8pm CST | Pre-orders close Friday | New Unicorn drops Tuesday',
      ),
    ).toBe('')
  })
})

function formatStreet() {
  return buildJoinPageIndexCopy({
    businessName: 'Peak Sparkle',
    city: '123 Main Street',
    state: 'Denver, Colorado 80202',
  }).location
}

function formatSuiteAndZip() {
  return buildJoinPageIndexCopy({
    businessName: 'Peak Sparkle',
    city: 'PO Box 12',
    state: 'Suite 4, Orlando, Florida 32801-1234',
  }).location
}
