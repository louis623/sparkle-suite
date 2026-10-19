import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRewrite } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'

import { proxy } from '@/proxy'
import {
  isBlingKitchenPantryAllowed,
  restrictPantryTemplateData,
} from '@/lib/bling-kitchen/pantry-access'
import { applyCustomDomainToTemplateData } from '@/lib/amethyst/public-site-links'
import { buildAmethystPublicPageJsonLd } from '@/lib/seo/amethyst-structured-data'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

const { loadTemplateMock, resolveSiteMock, resolveRepMock, loadActual } = vi.hoisted(() => ({
  loadTemplateMock: vi.fn(),
  resolveSiteMock: vi.fn(),
  resolveRepMock: vi.fn(),
  loadActual: {
    current: null as
      | typeof import('@/lib/amethyst/preview-template-data').loadAmethystPreviewTemplateData
      | null,
  },
}))

vi.mock('@/lib/amethyst/preview-template-data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/amethyst/preview-template-data')>(
    '@/lib/amethyst/preview-template-data',
  )
  loadActual.current = actual.loadAmethystPreviewTemplateData
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

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ marker: 'admin' }),
}))

vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: (...args: unknown[]) => resolveRepMock(...args),
}))

vi.mock('@/lib/services/site-recipes', () => ({
  getPublicSiteRecipes: vi.fn(async () => {
    throw new Error('pantry recipes must not load for a blocked rep')
  }),
}))

import { GET as GET_SLUG } from '@/app/[publicSiteSlug]/in-the-pantry/route'
import { GET as GET_SUBPATH } from '@/app/[publicSiteSlug]/in-the-pantry/[...path]/route'
import { GET as GET_CUSTOMER } from '@/app/customer-site/[page]/route'
import { GET as GET_TEMPLATE } from '@/app/api/amethyst/pantry-template/route'
import { GET as GET_ROBOTS } from '@/app/robots.txt/route'
import { GET as GET_SITEMAP } from '@/app/sitemap.xml/route'
import { GET as GET_LLMS } from '@/app/llms.txt/route'

type RepFixture = {
  name: string
  id: string
  slug: string
  domain: string
  email: string
  displayName: string
  businessName: string
  teamName: string
  pantry: boolean
}

const REPS: RepFixture[] = [
  {
    name: 'BlingKitchen',
    id: '9a971c05-3631-443e-bcb8-4e9a26e15885',
    slug: 'blingkitchen',
    domain: 'theblingkitchen.com',
    email: 'blingkitchen19@gmail.com',
    displayName: 'Heather',
    businessName: 'BlingKitchen',
    teamName: 'Opal Sparkling Gems',
    pantry: true,
  },
  {
    name: 'Mile High Fizz',
    id: 'rep-mile-high-fizz',
    slug: 'milehighfizz',
    domain: 'milehighfizz.com',
    email: 'lindsey@example.test',
    displayName: 'Lindsey',
    businessName: 'Mile High Fizz',
    teamName: 'Diamond Peak Society',
    pantry: false,
  },
  {
    name: 'Britt with Bling',
    id: 'rep-britt',
    slug: 'brittwithbling',
    domain: 'brittwithbling.com',
    email: 'britt@example.test',
    displayName: 'Britt',
    businessName: 'Britt with Bling',
    teamName: 'Britt with Bling',
    pantry: false,
  },
  {
    name: 'Dudes Fizzfest',
    id: 'rep-dudes',
    slug: 'dudesfizzfest',
    domain: 'dudesfizzfest.com',
    email: 'louis@neonrabbit.net',
    displayName: 'Louis',
    businessName: 'Dudes Fizzfest',
    teamName: 'Dudes Fizzfest',
    pantry: false,
  },
  {
    name: "Bri's Glowtique",
    id: '2b5a27c5-9c05-4014-8d0b-754e19815bf6',
    slug: 'brisglowtique',
    domain: 'brisglowtique.com',
    email: 'bri@example.test',
    displayName: 'Brianna',
    businessName: "Bri's Glowtique",
    teamName: 'Team Sparkaholics',
    pantry: false,
  },
  {
    name: 'Go for the Bling',
    id: 'rep-kim',
    slug: 'goforthebling',
    domain: 'goforthebling.com',
    email: 'kim@example.test',
    displayName: 'Kim',
    businessName: 'GofortheBling',
    teamName: 'GofortheBling',
    pantry: false,
  },
  {
    name: 'Heather impostor',
    id: 'rep-impostor',
    slug: 'notheather',
    domain: 'not-heather.example',
    email: 'blingkitchen19@gmail.com',
    displayName: 'Heather',
    businessName: 'BlingKitchen',
    teamName: 'Opal Sparkling Gems',
    pantry: false,
  },
]

const PREVIEW_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

function settingsFor(rep: RepFixture): SiteSettingsDashboardResult {
  return {
    displayName: rep.displayName,
    businessName: rep.businessName,
    email: rep.email,
    phone: '',
    bannerText: '',
    bannerVisible: false,
    tickerText: '',
    tickerVisible: true,
    tagline: `${rep.businessName} live jewelry reveals`,
    heroImageUrl: '',
    heroAnimationType: 'sparkle_rise',
    teamName: rep.teamName,
    joinTeamAccessEnabled: true,
    showJoinPage: true,
    customerSiteTemplate: 'amethyst',
    appearancePreset: 'amethyst',
    socialHandles: {},
  }
}

function repByHost(host: string) {
  const apex = host.trim().toLowerCase().replace(/^www\./, '')
  return REPS.find((rep) => rep.domain === apex)
}

function dependenciesFor(rep: RepFixture) {
  return {
    createAdminClient: () => ({ marker: 'admin' }),
    resolveAmethystPreviewRep: async () => ({
      id: rep.id,
      email: rep.email,
      shop_link: 'https://example.com/shop',
      streaming_links: {},
      public_site_slug: rep.slug,
    }),
    getSiteSettingsDashboard: async () => settingsFor(rep),
    getJoinTeamRoster: async () => [],
    getRequiredSetupState: async () => ({
      id: `setup-${rep.slug}`,
      repId: rep.id,
      status: 'dashboard_unlocked' as const,
      currentStep: 'final_preview_approval' as const,
      completedSteps: [],
      steps: REQUIRED_SETUP_STEPS,
      answers: {},
      generatedCopy: {},
      supportState: {},
      dashboardUnlockedAt: '2026-06-19T12:00:00.000Z',
      createdAt: null,
      updatedAt: null,
      nextStep: null,
      canUnlockDashboard: true,
    }),
  }
}

async function loadedTemplate(rep: RepFixture, input: { repId?: string; publicSiteSlug?: string }) {
  const load = loadActual.current
  if (!load) throw new Error('preview template loader was not captured')
  return load({
    ...input,
    env: PREVIEW_ENV,
    dependencies: dependenciesFor(rep),
  })
}

describe('pantry allowlist', () => {
  it('admits BlingKitchen by site id, slug, or domain, and nobody else', () => {
    expect(isBlingKitchenPantryAllowed({ repId: REPS[0].id })).toBe(true)
    expect(isBlingKitchenPantryAllowed({ publicSiteSlug: 'blingkitchen' })).toBe(true)
    expect(isBlingKitchenPantryAllowed({ publicSiteSlug: 'BlingKitchen' })).toBe(true)
    expect(isBlingKitchenPantryAllowed({ customDomain: 'theblingkitchen.com' })).toBe(true)
    expect(isBlingKitchenPantryAllowed({ customDomain: 'www.theblingkitchen.com' })).toBe(true)
    expect(isBlingKitchenPantryAllowed({ repId: 'theblingkitchen.com' })).toBe(true)
    expect(isBlingKitchenPantryAllowed({ publicSiteSlug: 'bling-kitchen' })).toBe(false)
    expect(isBlingKitchenPantryAllowed({})).toBe(false)

    for (const rep of REPS.filter((candidate) => !candidate.pantry)) {
      expect(
        isBlingKitchenPantryAllowed({
          repId: rep.id,
          publicSiteSlug: rep.slug,
          customDomain: rep.domain,
        }),
        rep.name,
      ).toBe(false)
    }
  })
})

describe('pantry crawl and links for every rep fixture', () => {
  beforeEach(() => {
    loadTemplateMock.mockReset()
    resolveSiteMock.mockReset()
    resolveRepMock.mockReset()
    resolveSiteMock.mockImplementation(async (host: string) => {
      const rep = repByHost(host)
      return rep
        ? { kind: 'serve' as const, host: rep.domain, repId: rep.id }
        : { kind: 'not_customer_host' as const }
    })
    resolveRepMock.mockImplementation(async (_admin: unknown, query: { publicSiteSlug?: string }) => {
      const rep = REPS.find((candidate) => candidate.slug === query.publicSiteSlug)
      return rep ? { id: rep.id, email: rep.email } : null
    })
    loadTemplateMock.mockImplementation(async (options: { repId?: string; publicSiteSlug?: string }) => {
      const rep =
        REPS.find((candidate) => candidate.slug === options.publicSiteSlug) ??
        REPS.find((candidate) => candidate.id === options.repId) ??
        repByHost(options.repId ?? '')
      if (!rep) throw new Error(`no fixture for ${JSON.stringify(options)}`)
      return loadedTemplate(rep, {
        repId: options.repId ?? rep.id,
        publicSiteSlug: options.publicSiteSlug ?? rep.slug,
      })
    })
  })

  it.each(REPS)('$name keeps pantry only when the site is on the allowlist', async (rep) => {
    const slugLoaded = await loadedTemplate(rep, {
      repId: rep.id,
      publicSiteSlug: rep.slug,
    })
    const slugTemplate = restrictPantryTemplateData(slugLoaded, {
      repId: rep.id,
      publicSiteSlug: rep.slug,
    })
    const domainTemplate = restrictPantryTemplateData(
      applyCustomDomainToTemplateData(
        await loadedTemplate(rep, { repId: rep.domain, publicSiteSlug: rep.slug }),
        rep.domain,
      ),
      { repId: rep.id, publicSiteSlug: rep.slug, customDomain: rep.domain },
    )
    if (rep.name === 'Heather impostor') {
      expect(JSON.stringify(slugLoaded)).toContain('/notheather/in-the-pantry')
    }
    const linked = [slugTemplate, domainTemplate].flatMap((template) => [
      template.homepage.pantryPageUrl,
      template.trade.pantryPageUrl,
      template.join.pantryPageUrl,
      JSON.stringify(template.homepage.footerLinks),
      JSON.stringify(template.trade.footerLinks),
      JSON.stringify(template.join.footerLinks),
    ])

    if (rep.pantry) {
      expect(slugTemplate.homepage.pantryPageUrl).toBe('/blingkitchen/in-the-pantry')
      expect(slugTemplate.trade.pantryPageUrl).toBe('/blingkitchen/in-the-pantry')
      expect(slugTemplate.join.pantryPageUrl).toBe('/blingkitchen/in-the-pantry')
      expect(domainTemplate.homepage.pantryPageUrl).toBe('/in-the-pantry')
      expect(domainTemplate.trade.pantryPageUrl).toBe('/in-the-pantry')
      expect(domainTemplate.join.pantryPageUrl).toBe('/in-the-pantry')
    } else {
      expect(linked.join('\n')).not.toContain('in-the-pantry')
      expect(linked.join('\n')).not.toContain('Pantry.html')
    }

    for (const page of ['homepage', 'trade', 'join'] as const) {
      const path = page === 'homepage' ? '/' : page === 'trade' ? '/trade' : '/join'
      const jsonLd = JSON.stringify(
        buildAmethystPublicPageJsonLd({
          origin: `https://${rep.domain}`,
          path,
          title: rep.businessName,
          description: rep.businessName,
          businessName: rep.businessName,
          repName: rep.displayName,
        }),
      )
      expect(jsonLd).not.toContain('in-the-pantry')
    }

    const sitemap = await GET_SITEMAP(
      new Request(`https://${rep.domain}/sitemap.xml`, {
        headers: { host: rep.domain },
      }),
    )
    const llms = await GET_LLMS(
      new Request(`https://${rep.domain}/llms.txt`, {
        headers: { host: rep.domain },
      }),
    )
    const robots = await GET_ROBOTS(
      new Request(`https://${rep.domain}/robots.txt`, {
        headers: { host: rep.domain },
      }),
    )
    const sitemapXml = await sitemap.text()
    const llmsText = await llms.text()
    const robotsText = await robots.text()

    expect(sitemap.status).toBe(200)
    expect(llms.status).toBe(200)
    expect(robots.status).toBe(200)
    // robots.txt stays exactly as production so Google can crawl and see the 404s.
    expect(robotsText).toBe(
      `User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /onboarding/\nSitemap: https://${rep.domain}/sitemap.xml\n`,
    )
    if (rep.pantry) {
      expect(sitemapXml).toContain('https://theblingkitchen.com/in-the-pantry')
      expect(llmsText).toContain('https://theblingkitchen.com/in-the-pantry')
    } else {
      expect(sitemapXml).not.toContain('in-the-pantry')
      expect(llmsText).not.toContain('in-the-pantry')
    }

    loadTemplateMock.mockClear()

    const slugResponse = await GET_SLUG(
      new Request(`https://www.yoursparklesuite.com/${rep.slug}/in-the-pantry`),
      { params: Promise.resolve({ publicSiteSlug: rep.slug }) },
    )
    const customerResponse = await GET_CUSTOMER(
      new Request(`https://${rep.domain}/customer-site/in-the-pantry`),
      { params: Promise.resolve({ page: 'in-the-pantry' }) },
    )
    const templateResponse = await GET_TEMPLATE(
      new Request(
        `https://www.yoursparklesuite.com/api/amethyst/pantry-template?c=${rep.id}&publicSiteSlug=${rep.slug}`,
      ),
    )
    const subpathResponse = await GET_SUBPATH()
    const proxyResponse = proxy(
      new NextRequest(`https://${rep.domain}/in-the-pantry/peach-tea`, {
        headers: { host: rep.domain },
      }),
    )

    if (rep.pantry) {
      expect(templateResponse.status).not.toBe(404)
    } else {
      for (const response of [slugResponse, customerResponse, templateResponse]) {
        const body = await response.text()
        expect(response.status).toBe(404)
        expect(response.headers.get('content-type')).toContain('text/plain')
        expect(body).toBe('Not found')
        expect(body).not.toContain(rep.businessName)
        expect(body).not.toContain('BlingKitchen')
        expect(body).not.toContain('pantry.jsx')
        expect(body).not.toContain('Pantry.html')
        expect(body).not.toContain('application/ld+json')
      }
      expect(loadTemplateMock).not.toHaveBeenCalled()
    }

    expect(subpathResponse.status).toBe(404)
    expect(await subpathResponse.text()).toBe('Not found')
    expect(isRewrite(proxyResponse)).toBe(false)
    expect(proxyResponse.status).toBe(404)
    expect(proxyResponse.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('keeps the Suite robots file identical to production and pantry out of Suite crawl files', async () => {
    const response = await GET_ROBOTS(
      new Request('https://www.yoursparklesuite.com/robots.txt', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    expect(await response.text()).toBe(
      'User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /onboarding/\nSitemap: https://www.yoursparklesuite.com/sitemap.xml\n',
    )

    const sitemap = await GET_SITEMAP(
      new Request('https://www.yoursparklesuite.com/sitemap.xml', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    const llms = await GET_LLMS(
      new Request('https://www.yoursparklesuite.com/llms.txt', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    expect(await sitemap.text()).not.toContain('in-the-pantry')
    expect(await llms.text()).not.toContain('in-the-pantry')
  })
})

describe('pantry follows the real request host, never ?c=', () => {
  const KITCHEN = REPS[0]
  const BRI = REPS.find((rep) => rep.slug === 'brisglowtique')!

  beforeEach(() => {
    loadTemplateMock.mockReset()
    resolveSiteMock.mockReset()
    resolveRepMock.mockReset()
    resolveSiteMock.mockImplementation(async (host: string) => {
      const rep = repByHost(host)
      return rep
        ? { kind: 'serve' as const, host: rep.domain, repId: rep.id }
        : { kind: 'not_customer_host' as const }
    })
    resolveRepMock.mockImplementation(async (_admin: unknown, query: { publicSiteSlug?: string }) => {
      const rep = REPS.find((candidate) => candidate.slug === query.publicSiteSlug)
      return rep ? { id: rep.id, email: rep.email } : null
    })
    loadTemplateMock.mockImplementation(async (options: { repId?: string; publicSiteSlug?: string }) => {
      const rep =
        REPS.find((candidate) => candidate.slug === options.publicSiteSlug) ??
        REPS.find((candidate) => candidate.id === options.repId) ??
        repByHost(options.repId ?? '')
      if (!rep) throw new Error(`no fixture for ${JSON.stringify(options)}`)
      return loadedTemplate(rep, {
        repId: options.repId ?? rep.id,
        publicSiteSlug: options.publicSiteSlug ?? rep.slug,
      })
    })
  })

  async function expectPantry404(response: Response) {
    expect(response.status).toBe(404)
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
    const body = await response.text()
    expect(body).toBe('Not found')
    expect(body).not.toContain('BlingKitchen')
  }

  function customer(url: string, headers: Record<string, string>) {
    return GET_CUSTOMER(new Request(url, { headers }), {
      params: Promise.resolve({ page: 'in-the-pantry' }),
    })
  }

  it('404s brisglowtique.com/customer-site/in-the-pantry?c=theblingkitchen.com', async () => {
    await expectPantry404(
      await customer('https://brisglowtique.com/customer-site/in-the-pantry?c=theblingkitchen.com', {
        host: 'brisglowtique.com',
      }),
    )
    await expectPantry404(
      await customer(
        `https://brisglowtique.com/customer-site/in-the-pantry?c=${KITCHEN.id}`,
        { host: 'brisglowtique.com', 'x-forwarded-host': 'brisglowtique.com' },
      ),
    )
  })

  it('404s ?c= that points BlingKitchen at another rep on her own domain', async () => {
    await expectPantry404(
      await customer('https://theblingkitchen.com/customer-site/in-the-pantry?c=brisglowtique.com', {
        host: 'theblingkitchen.com',
      }),
    )
  })

  it('404s /customer-site/in-the-pantry on the Suite host for every ?c=', async () => {
    for (const c of ['', '?c=theblingkitchen.com', '?c=blingkitchen', `?c=${KITCHEN.id}`, '?c=dudesfizzfest']) {
      await expectPantry404(
        await customer(`https://www.yoursparklesuite.com/customer-site/in-the-pantry${c}`, {
          host: 'www.yoursparklesuite.com',
        }),
      )
    }
  })

  it('still serves the proxy-rewritten theblingkitchen.com pantry', async () => {
    const rewritten = await customer(
      'https://theblingkitchen.com/customer-site/in-the-pantry?c=theblingkitchen.com',
      { host: 'theblingkitchen.com', 'x-sparkle-customer-domain': 'theblingkitchen.com' },
    )
    expect(rewritten.status).toBe(200)
    const forwarded = await customer(
      'https://theblingkitchen.com/customer-site/in-the-pantry?c=theblingkitchen.com',
      { host: 'theblingkitchen.com', 'x-forwarded-host': 'theblingkitchen.com' },
    )
    expect(forwarded.status).toBe(200)
  })

  it('404s the /blingkitchen slug pantry on another rep domain but keeps it on the Suite host', async () => {
    await expectPantry404(
      await GET_SLUG(
        new Request('https://brisglowtique.com/blingkitchen/in-the-pantry', {
          headers: { host: 'brisglowtique.com' },
        }),
        { params: Promise.resolve({ publicSiteSlug: 'blingkitchen' }) },
      ),
    )
    const suite = await GET_SLUG(
      new Request('https://www.yoursparklesuite.com/blingkitchen/in-the-pantry', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
      { params: Promise.resolve({ publicSiteSlug: 'blingkitchen' }) },
    )
    expect(suite.status).toBe(200)
  })

  it('404s the pantry data script when another rep domain asks for BlingKitchen', async () => {
    await expectPantry404(
      await GET_TEMPLATE(
        new Request(`https://brisglowtique.com/api/amethyst/pantry-template?c=${KITCHEN.id}`, {
          headers: { host: 'brisglowtique.com' },
        }),
      ),
    )
    const own = await GET_TEMPLATE(
      new Request(`https://theblingkitchen.com/api/amethyst/pantry-template?c=${KITCHEN.id}`, {
        headers: { host: 'theblingkitchen.com' },
      }),
    )
    expect(own.status).not.toBe(404)
  })

  it('drops pantry links when BlingKitchen data is requested from another rep domain', () => {
    const data = {
      homepage: { pantryPageUrl: '/in-the-pantry' },
      trade: { pantryPageUrl: '/in-the-pantry' },
      join: { pantryPageUrl: '/in-the-pantry' },
    }
    const onBri = restrictPantryTemplateData(data, {
      repId: KITCHEN.domain,
      customDomain: BRI.domain,
      requestHost: BRI.domain,
    })
    expect(JSON.stringify(onBri)).not.toContain('in-the-pantry')
    const onKitchen = restrictPantryTemplateData(data, {
      repId: KITCHEN.id,
      customDomain: KITCHEN.domain,
      requestHost: 'www.theblingkitchen.com',
    })
    expect(onKitchen).toBe(data)
  })

  it('keeps proxy behavior for non-pantry routes exactly as production', () => {
    const join = proxy(
      new NextRequest('https://brisglowtique.com/join', { headers: { host: 'brisglowtique.com' } }),
    )
    expect(isRewrite(join)).toBe(true)
    const joinSlash = proxy(
      new NextRequest('https://brisglowtique.com/join/', { headers: { host: 'brisglowtique.com' } }),
    )
    expect(isRewrite(joinSlash)).toBe(false)
    expect(joinSlash.status).not.toBe(404)
    const pantrySlash = proxy(
      new NextRequest('https://theblingkitchen.com/in-the-pantry/', {
        headers: { host: 'theblingkitchen.com' },
      }),
    )
    expect(pantrySlash.status).not.toBe(404)
  })
})
