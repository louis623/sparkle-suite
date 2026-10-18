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
import {
  mountReplacesJoinServerIndex,
  productionJoinVisibleCopy,
  productionJoinVisibleText,
} from '@/lib/amethyst/join-server-html'

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

const MILE_JOIN_WORDS = 371

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
      appearancePreset: 'gilded_autumn',
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
    expect(mile.description).not.toBe(glow.description)
    expect(mile.canonical).not.toBe(glow.canonical)

    expect(mile.title).toBe(
      'Mile High Fizz — Join Diamond Peak Society',
    )
    expect(mile.description).toContain('Mile High Fizz')
    expect(mile.description).toContain('Tuesdays, Thursdays, and Saturdays')
    expect(mile.description).not.toContain('Live schedule coming soon')
    expect(mile.canonical).toBe('https://milehighfizz.com/join')
    expect(mile.ogUrl).toBe(mile.canonical)

    expect(glow.title).toBe(
      "Bri's Glowtique in Wichita, Kansas — Join Team Sparkaholics",
    )
    expect(glow.description).toContain("Bri's Glowtique in Wichita, Kansas")
    expect(glow.description).toContain('studio for live jewelry reveals')
    expect(glow.description).not.toContain('Live schedule coming soon')
    expect(glow.canonical).toBe('https://brisglowtique.com/join')
    expect(glow.ogUrl).toBe(glow.canonical)

    for (const html of [mileHtml, glowHtml]) {
      expect(html).toContain('<meta name="robots" content="index,follow"')
      expect(html.toLowerCase()).not.toContain('noindex')
      expect(html).not.toContain('class="join-index"')
      expect(html).not.toContain('Littleton')
    }
    for (const value of [mile.title, mile.description, glow.title, glow.description]) {
      expect(value).not.toMatch(BANNED_COPY)
    }
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
    expect(wordCount(afterJoin)).toBeGreaterThan(wordCount(beforeJoin))
    expect(bodyWordCount(readPublicHtml('Homepage.html'))).toBe(0)
    expect(bodyWordCount(mileHomeHtml)).toBe(33)
    expect(bodyWordCount(mileFloorHtml)).toBe(55)
    expect(bodyWordCount(glowPantryHtml)).toBe(47)
  })

  it('keeps the production join heading and intro on a non-skin preset', () => {
    const source = templateFor(
      settings({
        displayName: 'Lindsey',
        businessName: 'Mile High Fizz',
        teamName: 'Diamond Peak Society',
        appearancePreset: 'gilded_autumn',
        tickerText: '',
      }),
    )
    const indexed = applyPublicJoinIndex(source)
    const productionHeading = 'Join Diamond Peak Society'
    const productionIntro =
      'Explore what it takes to join Diamond Peak Society with Lindsey, review the current official details, and ask questions before you decide.'

    expect(source.join.heroTitle).toBe(productionHeading)
    expect(source.join.heroPitch).toBe(productionIntro)
    expect(indexed.join.heroTitle).toBe(source.join.heroTitle)
    expect(indexed.join.heroPitch).toBe(source.join.heroPitch)
    expect(indexed.join.repCity).toBe(source.join.repCity)
    expect(indexed.join.repState).toBe(source.join.repState)
    expect(indexed.join.indexTitle).toBe('Mile High Fizz — Join Diamond Peak Society')
    expect(indexed.join.indexDescription).toContain('Mile High Fizz')
    expect(indexed.join.indexDescription).not.toContain('Live schedule coming soon')
    expect(indexed.join.heroPitch).not.toContain('Live schedule coming soon')
    expect(indexed.join.indexTitle).not.toContain('Littleton')
  })

  it('puts the production heading, intro, and team details in the initial HTML once', async () => {
    const response = await GET(
      new Request('https://brisglowtique.com/customer-site/join'),
      { params: Promise.resolve({ page: 'join' }) },
    )
    const mileResponse = await GET(
      new Request('https://milehighfizz.com/customer-site/join'),
      { params: Promise.resolve({ page: 'join' }) },
    )
    const html = await response.text()
    const mileHtml = await mileResponse.text()
    const copy = productionJoinVisibleCopy(applyPublicJoinIndex(glowtique))
    const mileCopy = productionJoinVisibleCopy(applyPublicJoinIndex(mileHigh))

    expect(copy.heading).toBe('Join Team Sparkaholics')
    expect(copy.intro).toBe(
      'Explore what it takes to join Team Sparkaholics with Brianna, review the current official details, and ask questions before you decide.',
    )
    expect(copy.heading).toBe(glowtique.join.heroTitle)
    expect(copy.intro).toBe(glowtique.join.heroPitch)
    expect(mileCopy.heading).toBe('Join Diamond Peak Society')
    expect(mileCopy.intro).toBe(mileHigh.join.heroPitch)
    expect(mileCopy.cards).toEqual([])

    expect(headingTexts(html)).toEqual([copy.heading])
    expect(headingTexts(mileHtml)).toEqual([mileCopy.heading])
    expect(indexText(html)).toBe(productionJoinVisibleText(copy))
    expect(indexText(mileHtml)).toBe(productionJoinVisibleText(mileCopy))
    expect(html).toContain("Bri's Glowtique")
    expect(html).toContain('Wichita, Kansas')
    expect(html).toContain(
      'New teammates get a weekly planning call and help preparing a first live show.',
    )
    expect(html).toContain('Ask Brianna for current details')
    expect(html).not.toMatch(/<main id="join-server-index"[^>]*\shidden/)
    expect(html).toContain('node.hidden=true')
    expect(html).not.toContain('class="join-index"')
    expect(html).not.toContain('Live schedule coming soon')

    const mounted = mountReplacesJoinServerIndex(html)
    expect(mounted).not.toContain('id="join-server-index"')
    expect(headingTexts(mounted)).toEqual([])
    expect(productionJoinVisibleText(productionJoinVisibleCopy(glowtique))).toBe(
      productionJoinVisibleText(copy),
    )
    expect(indexText(html)).toBe(
      productionJoinVisibleText(productionJoinVisibleCopy(glowtique)),
    )

    expect(bodyWordCount(readPublicHtml('Join.html'))).toBe(0)
    // Heading, intro, team cards, Why Join, FAQ, and the final call to action.
    expect(bodyWordCount(html)).toBe(435)
    expect(bodyWordCount(mileHtml)).toBe(MILE_JOIN_WORDS)
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

function decodeText(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function bodyHtml(html: string) {
  const withoutCode = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  return withoutCode.split(/<body[^>]*>/i)[1]?.split(/<\/body>/i)[0] ?? ''
}

function headingTexts(html: string) {
  return [...bodyHtml(html).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) =>
    decodeText(match[1].replace(/<[^>]+>/g, ' ')),
  )
}

function indexText(html: string) {
  const block = bodyHtml(html).match(/<main id="join-server-index">[\s\S]*?<\/main>/)?.[0] ?? ''
  return decodeText(block.replace(/<[^>]+>/g, ' '))
}

function bodyWordCount(html: string) {
  const text = decodeText(bodyHtml(html).replace(/<[^>]+>/g, ' '))
  return text ? text.split(/\s+/).filter(Boolean).length : 0
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
