import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mapPreviewSettingsToHomepageTemplateData,
  mapPreviewSettingsToJoinTemplateData,
  mapPreviewSettingsToTradeTemplateData,
} from '@/lib/amethyst/preview-template-data'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const { loadTemplateMock, resolveSiteMock, recipesMock } = vi.hoisted(() => ({
  loadTemplateMock: vi.fn(),
  resolveSiteMock: vi.fn(),
  recipesMock: vi.fn(),
}))

vi.mock('@/lib/amethyst/preview-template-data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/amethyst/preview-template-data')>(
    '@/lib/amethyst/preview-template-data',
  )
  return {
    ...actual,
    loadAmethystPreviewTemplateData: (...args: unknown[]) => loadTemplateMock(...args),
  }
})

vi.mock('@/lib/amethyst/customer-domain-site', async () => {
  const actual = await vi.importActual<typeof import('@/lib/amethyst/customer-domain-site')>(
    '@/lib/amethyst/customer-domain-site',
  )
  return {
    ...actual,
    resolveCustomerDomainSiteState: (...args: unknown[]) => resolveSiteMock(...args),
  }
})

vi.mock('@/lib/amethyst/join-page-access', () => ({
  canServeTargetedAmethystJoinPage: vi.fn(async () => true),
}))

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ marker: 'admin' }) }))

vi.mock('@/lib/services/site-recipes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/site-recipes')>(
    '@/lib/services/site-recipes',
  )
  return { ...actual, getPublicSiteRecipes: (...args: unknown[]) => recipesMock(...args) }
})

vi.mock('@/lib/services/site-settings', () => ({
  getSiteSettingsDashboard: vi.fn(async () => ({ appearancePreset: 'amethyst' })),
}))

vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: vi.fn(),
}))

import { GET as GET_CUSTOMER } from '@/app/customer-site/[page]/route'
import { GET as GET_SLUG } from '@/app/[publicSiteSlug]/in-the-pantry/route'
import { GET as GET_TEMPLATE } from '@/app/api/amethyst/pantry-template/route'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures/bling-kitchen-pantry')

function fixture(name: string) {
  return readFileSync(resolve(FIXTURE_DIR, name), 'utf8')
}

function settings(): SiteSettingsDashboardResult {
  return {
    displayName: 'Heather',
    businessName: 'BlingKitchen',
    email: 'blingkitchen19@gmail.com',
    phone: '',
    bannerText: '',
    bannerVisible: false,
    tickerText: '',
    tickerVisible: true,
    tagline: 'Serving Sparkle from the Heart of the Home',
    heroImageUrl: '',
    heroAnimationType: 'sparkle_rise',
    teamName: 'Opal Sparkling Gems',
    joinTeamAccessEnabled: true,
    showJoinPage: true,
    customerSiteTemplate: 'amethyst',
    appearancePreset: 'amethyst',
    socialHandles: {},
  }
}

describe('BlingKitchen pantry bytes versus the pre-allowlist base', () => {
  beforeEach(() => {
    loadTemplateMock.mockReset()
    resolveSiteMock.mockReset()
    recipesMock.mockReset()
    const extras = { shopLink: 'https://example.com/shop', streamingLinks: {} }
    const siteSettings = settings()
    const template = {
      appearancePreset: 'amethyst' as const,
      homepage: mapPreviewSettingsToHomepageTemplateData(siteSettings, extras),
      trade: mapPreviewSettingsToTradeTemplateData(siteSettings, extras),
      join: {
        ...mapPreviewSettingsToJoinTemplateData(siteSettings, extras),
        publicSiteVariant: 'bling_kitchen_hybrid' as const,
      },
    }
    loadTemplateMock.mockResolvedValue(template)
    resolveSiteMock.mockResolvedValue({
      kind: 'serve',
      host: 'theblingkitchen.com',
      repId: 'rep-kitchen',
    })
    recipesMock.mockResolvedValue([])
    vi.mocked(resolveAmethystPreviewRep).mockResolvedValue({
      id: 'rep-bling',
      email: 'blingkitchen19@gmail.com',
    } as never)
  })

  it('keeps the custom-domain pantry document byte-for-byte', async () => {
    const response = await GET_CUSTOMER(
      new Request('https://theblingkitchen.com/customer-site/in-the-pantry'),
      { params: Promise.resolve({ page: 'in-the-pantry' }) },
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBeNull()
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(html).toContain('<meta name="robots" content="index,follow" />')
    expect(html).toBe(fixture('domain.html'))
  })

  it('keeps the public-slug pantry document byte-for-byte', async () => {
    const response = await GET_SLUG(
      new Request('https://www.yoursparklesuite.com/blingkitchen/in-the-pantry'),
      { params: Promise.resolve({ publicSiteSlug: 'blingkitchen' }) },
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('<meta name="robots" content="index,follow" />')
    expect(html).toBe(fixture('slug.html'))
  })

  it('keeps the pantry template script byte-for-byte', async () => {
    const response = await GET_TEMPLATE(
      new Request(
        'https://www.yoursparklesuite.com/api/amethyst/pantry-template?publicSiteSlug=blingkitchen',
      ),
    )
    const script = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/javascript')
    expect(script).toBe(fixture('template.js'))
  })
})
