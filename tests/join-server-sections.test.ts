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
  productionJoinVisibleCopy,
  productionJoinVisibleText,
  renderJoinServerIndexBlock,
} from '@/lib/amethyst/join-server-html'
import { joinRecruitingProfile } from '@/lib/amethyst/join-server-sections'
import { applyPublicJoinIndex } from '@/lib/amethyst/public-join-index'

const { loadTemplateMock, resolveSiteMock, recipesMock } = vi.hoisted(() => ({
  loadTemplateMock: vi.fn(),
  resolveSiteMock: vi.fn(),
  recipesMock: vi.fn(),
}))

vi.mock('@/lib/amethyst/preview-template-data', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/amethyst/preview-template-data')
  >('@/lib/amethyst/preview-template-data')
  return {
    ...actual,
    loadAmethystPreviewTemplateData: (...args: unknown[]) => loadTemplateMock(...args),
  }
})

vi.mock('@/lib/amethyst/customer-domain-site', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/amethyst/customer-domain-site')
  >('@/lib/amethyst/customer-domain-site')
  return {
    ...actual,
    resolveCustomerDomainSiteState: (...args: unknown[]) => resolveSiteMock(...args),
  }
})

vi.mock('@/lib/amethyst/join-page-access', () => ({
  canServeTargetedAmethystJoinPage: vi.fn(async () => true),
}))

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))

vi.mock('@/lib/services/site-recipes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/site-recipes')>(
    '@/lib/services/site-recipes',
  )
  return { ...actual, getPublicSiteRecipes: (...args: unknown[]) => recipesMock(...args) }
})

import { GET } from '@/app/customer-site/[page]/route'

const JOIN_JSX = readFileSync(resolve(process.cwd(), 'public/amethyst/join.jsx'), 'utf8')
const SECTIONS_SOURCE = readFileSync(
  resolve(process.cwd(), 'lib/amethyst/join-server-sections.ts'),
  'utf8',
)

function settings(overrides: Partial<SiteSettingsDashboardResult>): SiteSettingsDashboardResult {
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

function decode(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function blockText(html: string) {
  const block = html.match(/<main id="join-server-index">[\s\S]*?<\/main>/)?.[0] ?? ''
  return decode(block.replace(/<[^>]+>/g, ' '))
}

/** Static text fragments of every string and template literal in the source. */
function literalFragments(source: string) {
  const fragments: string[] = []
  const pattern = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  for (const match of source.matchAll(pattern)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? ''
    for (const piece of raw.split(/\$\{[^}]*\}/)) {
      const cleaned = piece.replace(/\\'/g, "'").replace(/\\"/g, '"').trim()
      if (cleaned.length >= 14 && /[a-z] [a-z]/i.test(cleaned)) fragments.push(cleaned)
    }
  }
  return fragments
}

const mileHigh = () => {
  const template = templateFor(
    settings({
      displayName: 'Lindsey',
      businessName: 'Mile High Fizz',
      teamName: 'Diamond Peak Society',
      appearancePreset: 'gilded_autumn',
    }),
  )
  return { ...template, join: { ...template.join, publicSiteVariant: 'mile_high_fizz_hybrid' as const } }
}

const goForTheBling = () =>
  templateFor(
    settings({
      displayName: 'Kim',
      businessName: 'GofortheBling',
      teamName: 'GofortheBling',
    }),
  )

describe('join server Why Join, FAQ, and CTA copy', () => {
  it('uses only copy that join.jsx already paints', () => {
    const fragments = literalFragments(SECTIONS_SOURCE).filter(
      (fragment) => !fragment.startsWith('@/') && !fragment.includes('join-server-sections'),
    )
    expect(fragments.length).toBeGreaterThan(40)
    // join.jsx wraps "Income Disclosure Statement" in a link inside these two
    // sentences, so check them piece by piece.
    const composed: Record<string, string[]> = {
      "If you're evaluating income potential, read the Bomb Party Income Disclosure Statement before enrolling.":
        ["If you're evaluating income potential, read the", 'Bomb Party Income Disclosure Statement', 'before enrolling.'],
      'Review the Income Disclosure Statement before you enroll.':
        ['Review the', 'Income Disclosure Statement', 'before you enroll.'],
    }
    for (const pieces of Object.values(composed)) {
      for (const piece of pieces) expect(JOIN_JSX).toContain(piece)
    }
    const missing = fragments
      .filter((fragment) => !composed[fragment])
      // Nested template literals split oddly; their inner pieces are checked on their own.
      .filter((fragment) => !fragment.includes('${') && !fragment.startsWith(':'))
      .filter((fragment) => !JOIN_JSX.includes(fragment))
    expect(missing).toEqual([])
  })

  it('picks the same personal recruiting profile join.jsx picks', () => {
    expect(joinRecruitingProfile({ targeted: false, repId: 'goforthebling.com' })).toBeNull()
    expect(joinRecruitingProfile({ targeted: true, repId: 'goforthebling.com' })?.name).toBe('Kim')
    expect(joinRecruitingProfile({ targeted: true, publicSiteSlug: 'blingkitchen' })?.name).toBe('Heather')
    expect(joinRecruitingProfile({ targeted: true, repId: 'sparklybutterflies.com' })?.name).toBe('Kelly')
    expect(joinRecruitingProfile({ targeted: true, repId: 'milehighfizz.com' })).toBeNull()
  })

  it('server-renders Why Join, FAQ, and the final CTA once, with one H1', () => {
    const template = applyPublicJoinIndex(mileHigh())
    const html = renderJoinServerIndexBlock(template, { targeted: true, repId: 'rep-mile' })
    expect(html.match(/<h1>/g)).toHaveLength(1)
    const text = blockText(html)
    expect(text).toBe(productionJoinVisibleText(productionJoinVisibleCopy(template, { targeted: true, repId: 'rep-mile' })))
    expect(text).toContain('Why Join the Diamond Peak Society?')
    expect(text).toContain('Frequently Asked Questions')
    expect(text).toContain('What is the Diamond Peak Society?')
    expect(text).toContain('Ready to Sparkle With the Diamond Peak Society?')
    expect(text).toContain('Review the Income Disclosure Statement before you enroll.')
    expect(text.split(' ').length).toBeGreaterThan(300)
    for (const heading of ['Why join', 'Frequently Asked Questions', 'Ready to Sparkle With']) {
      expect(text.split(heading).length - 1).toBe(1)
    }
    expect(text).not.toMatch(/Live Queue/i)
    expect(text).not.toMatch(/\btrad(e|es|ed|ing)\b/i)
  })

  it('uses the personal copy for GofortheBling when the request targets that site', () => {
    const template = applyPublicJoinIndex(goForTheBling())
    const text = blockText(
      renderJoinServerIndexBlock(template, { targeted: true, repId: 'goforthebling.com' }),
    )
    expect(text).toContain('Find your sparkle with Kim')
    expect(text).toContain("What is it like to join Kim's GofortheBling team?")
    expect(text).toContain('Straight answers about joining Kim and the GofortheBling team.')
    expect(text).not.toContain('Why Join GofortheBling?')
  })
})

describe('rep pantry robots', () => {
  const glow = templateFor(
    settings({ displayName: 'Brianna', businessName: "Bri's Glowtique", teamName: 'Team Sparkaholics' }),
  )
  const kitchen = (() => {
    const template = templateFor(
      settings({ displayName: 'Heather', businessName: 'BlingKitchen', teamName: 'Opal Sparkling Gems' }),
    )
    return { ...template, join: { ...template.join, publicSiteVariant: 'bling_kitchen_hybrid' as const } }
  })()

  beforeEach(() => {
    loadTemplateMock.mockReset()
    resolveSiteMock.mockReset()
    recipesMock.mockReset()
    loadTemplateMock.mockImplementation(async (options: { repId?: string }) =>
      options.repId === 'rep-kitchen' ? kitchen : glow,
    )
    resolveSiteMock.mockImplementation(async (host: string) =>
      String(host).includes('theblingkitchen')
        ? { kind: 'serve', host: 'theblingkitchen.com', repId: 'rep-kitchen' }
        : { kind: 'serve', host: 'brisglowtique.com', repId: 'rep-bri' },
    )
  })

  async function pantry(host: string) {
    const response = await GET(new Request(`https://${host}/customer-site/in-the-pantry`), {
      params: Promise.resolve({ page: 'in-the-pantry' }),
    })
    return { response, html: await response.text() }
  }

  it('returns a real 404 for every rep except BlingKitchen', async () => {
    recipesMock.mockResolvedValue([
      { title: 'Peach tea', description: 'A cold pitcher for show night.' },
    ])
    const other = await pantry('brisglowtique.com')
    expect(other.response.status).toBe(404)
    expect(other.response.headers.get('content-type')).toContain('text/plain')
    expect(other.response.headers.get('x-robots-tag')).toBe('noindex')
    expect(other.html).toBe('Not found')
    expect(other.html).not.toContain('Bri')
    expect(other.html).not.toContain('BlingKitchen')
    expect(other.html).not.toContain('pantry.jsx')
    expect(other.html).not.toContain('application/ld+json')
  })

  it('keeps BlingKitchen pantry indexable', async () => {
    recipesMock.mockResolvedValue([])
    const kitchenPage = await pantry('theblingkitchen.com')
    expect(kitchenPage.response.status).toBe(200)
    expect(kitchenPage.response.headers.get('x-robots-tag')).toBeNull()
    expect(kitchenPage.html).toContain('<meta name="robots" content="index,follow" />')
    expect(kitchenPage.html).not.toContain('noindex')
  })
})
