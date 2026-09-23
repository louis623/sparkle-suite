import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const createAdminClientMock = vi.hoisted(() => vi.fn())
const resolveAmethystPreviewRepMock = vi.hoisted(() => vi.fn())
const loadAmethystPreviewTemplateDataMock = vi.hoisted(() => vi.fn())
const getSiteSettingsDashboardMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: resolveAmethystPreviewRepMock,
}))

vi.mock('@/lib/services/site-settings', () => ({
  getSiteSettingsDashboard: getSiteSettingsDashboardMock,
}))

vi.mock('@/lib/amethyst/preview-template-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/amethyst/preview-template-data')>()
  return {
    ...actual,
    loadAmethystPreviewTemplateData: loadAmethystPreviewTemplateDataMock,
  }
})

import { GET } from '@/app/[publicSiteSlug]/route'
import { GET as GET_JOIN } from '@/app/[publicSiteSlug]/join/route'
import { GET as GET_PANTRY } from '@/app/[publicSiteSlug]/in-the-pantry/route'
import { GET as GET_TRADE } from '@/app/[publicSiteSlug]/trade/route'
import { DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'

const defaultAmethystPreviewTemplateData = {
  appearancePreset: DEFAULT_AMETHYST_APPEARANCE_PRESET,
  homepage: defaultAmethystHomepageTemplateData,
  trade: defaultAmethystTradeTemplateData,
  join: defaultAmethystJoinTemplateData,
}

describe('public site slug route', () => {
  beforeEach(() => {
    createAdminClientMock.mockReset()
    resolveAmethystPreviewRepMock.mockReset()
    loadAmethystPreviewTemplateDataMock.mockReset()
    getSiteSettingsDashboardMock.mockReset()
    loadAmethystPreviewTemplateDataMock.mockResolvedValue(defaultAmethystPreviewTemplateData)
    getSiteSettingsDashboardMock.mockResolvedValue({
      joinTeamAccessEnabled: true,
      showJoinPage: true,
    })
  })

  it('returns 404 for invalid public site slugs', async () => {
    const response = await GET(
      new Request('https://www.yoursparklesuite.com/gracie-sparkle-party'),
      { params: Promise.resolve({ publicSiteSlug: 'gracie-sparkle-party' }) },
    )

    expect(response.status).toBe(404)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(resolveAmethystPreviewRepMock).not.toHaveBeenCalled()
  })

  it('returns 404 when no rep owns the public site slug', async () => {
    const admin = { marker: 'admin' }
    createAdminClientMock.mockReturnValue(admin)
    resolveAmethystPreviewRepMock.mockResolvedValue(null)

    const response = await GET(
      new Request('https://www.yoursparklesuite.com/graciesparkleparty'),
      { params: Promise.resolve({ publicSiteSlug: 'graciesparkleparty' }) },
    )

    expect(response.status).toBe(404)
    expect(resolveAmethystPreviewRepMock).toHaveBeenCalledWith(admin, {
      publicSiteSlug: 'graciesparkleparty',
      select: 'id, email',
    })
  })

  it('renders the homepage with slug canonicals and rep-targeted template data', async () => {
    const admin = { marker: 'admin' }
    createAdminClientMock.mockReturnValue(admin)
    resolveAmethystPreviewRepMock.mockResolvedValue({
      id: 'rep-gracie',
      email: 'gracie@example.test',
    })

    const response = await GET(
      new Request('https://www.yoursparklesuite.com/GracieSparkleParty'),
      { params: Promise.resolve({ publicSiteSlug: 'GracieSparkleParty' }) },
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(loadAmethystPreviewTemplateDataMock).toHaveBeenCalledWith({
      repId: 'rep-gracie',
      publicSiteSlug: 'graciesparkleparty',
    })
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/graciesparkleparty" />',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://www.yoursparklesuite.com/graciesparkleparty" />',
    )
    expect(html).toContain(
      '"@id":"https://www.yoursparklesuite.com/graciesparkleparty#webpage"',
    )
    expect(html).toContain('href="/amethyst/tokens.css?v=20260725-emerald-garden"')
    expect(html).toContain('href="/amethyst/components.css?v=20260725-emerald-garden"')
    expect(html).toContain(
      'href="/amethyst/homepage.css?v=20260923-trade-tip"',
    )
    expect(html).toContain('src="/amethyst/tweaks-panel.jsx?v=20260725-emerald-garden"')
    expect(html).toContain('src="/amethyst/live-lineup.js?v=20260909-lineup-v2"')
    expect(html).toContain('src="/amethyst/homepage.jsx?v=20260923-trade-tip"')
    expect(html).toContain(
      '/api/amethyst/homepage-template?c=rep-gracie&amp;publicSiteSlug=graciesparkleparty',
    )
    expect(html).not.toContain('href="tokens.css"')
    expect(html).not.toContain('src="homepage.jsx"')
    expect(html).not.toContain('?c=graciesparkleparty')
  })

  it('keeps public slug and template routes dynamic for saved theme changes', () => {
    const routeFiles = [
      'app/[publicSiteSlug]/route.ts',
      'app/[publicSiteSlug]/join/route.ts',
      'app/[publicSiteSlug]/in-the-pantry/route.ts',
      'app/[publicSiteSlug]/trade/route.ts',
      'app/api/amethyst/homepage-template/route.ts',
      'app/api/amethyst/pantry-template/route.ts',
      'app/api/amethyst/trade-template/route.ts',
    ]

    for (const routeFile of routeFiles) {
      const source = readFileSync(resolve(process.cwd(), routeFile), 'utf8')
      expect(source).toContain("export const dynamic = 'force-dynamic'")
    }
  })

  it('renders the dance floor with slug canonicals and rep-targeted template data', async () => {
    const admin = { marker: 'admin' }
    createAdminClientMock.mockReturnValue(admin)
    resolveAmethystPreviewRepMock.mockResolvedValue({
      id: 'rep-mile-high-fizz',
      email: 'lindsey@example.test',
    })

    const response = await GET_TRADE(
      new Request('https://www.yoursparklesuite.com/MileHighFizz/trade'),
      { params: Promise.resolve({ publicSiteSlug: 'MileHighFizz' }) },
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(loadAmethystPreviewTemplateDataMock).toHaveBeenCalledWith({
      repId: 'rep-mile-high-fizz',
      publicSiteSlug: 'milehighfizz',
    })
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/milehighfizz/trade" />',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://www.yoursparklesuite.com/milehighfizz/trade" />',
    )
    expect(html).toContain(
      '"@id":"https://www.yoursparklesuite.com/milehighfizz/trade#webpage"',
    )
    expect(html).toContain(
      '/api/amethyst/trade-template?c=rep-mile-high-fizz&amp;publicSiteSlug=milehighfizz',
    )
    expect(html).not.toContain('?c=milehighfizz')
  })

  it('renders the join page with slug canonicals and rep-targeted template data', async () => {
    const admin = { marker: 'admin' }
    createAdminClientMock.mockReturnValue(admin)
    resolveAmethystPreviewRepMock.mockResolvedValue({
      id: 'rep-mile-high-fizz',
      email: 'lindsey@example.test',
    })

    const response = await GET_JOIN(
      new Request('https://www.yoursparklesuite.com/MileHighFizz/join'),
      { params: Promise.resolve({ publicSiteSlug: 'MileHighFizz' }) },
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(loadAmethystPreviewTemplateDataMock).toHaveBeenCalledWith({
      repId: 'rep-mile-high-fizz',
      publicSiteSlug: 'milehighfizz',
    })
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/milehighfizz/join" />',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://www.yoursparklesuite.com/milehighfizz/join" />',
    )
    expect(html).toContain(
      '"@id":"https://www.yoursparklesuite.com/milehighfizz/join#webpage"',
    )
    expect(html).toContain(
      '/api/amethyst/join-template?c=rep-mile-high-fizz&amp;publicSiteSlug=milehighfizz',
    )
    expect(html).not.toContain('?c=milehighfizz')
  })

  it('renders the Pantry page with slug canonicals and rep-targeted template data', async () => {
    const admin = { marker: 'admin' }
    createAdminClientMock.mockReturnValue(admin)
    resolveAmethystPreviewRepMock.mockResolvedValue({
      id: 'rep-bling-kitchen',
      email: 'blingkitchen19@gmail.com',
    })

    const response = await GET_PANTRY(
      new Request('https://www.yoursparklesuite.com/BlingKitchen/in-the-pantry'),
      { params: Promise.resolve({ publicSiteSlug: 'BlingKitchen' }) },
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(loadAmethystPreviewTemplateDataMock).toHaveBeenCalledWith({
      repId: 'rep-bling-kitchen',
      publicSiteSlug: 'blingkitchen',
    })
    expect(html).toContain(
      '<link rel="canonical" href="https://www.yoursparklesuite.com/blingkitchen/in-the-pantry" />',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://www.yoursparklesuite.com/blingkitchen/in-the-pantry" />',
    )
    expect(html).toContain(
      '"@id":"https://www.yoursparklesuite.com/blingkitchen/in-the-pantry#webpage"',
    )
    expect(html).toContain(
      '/api/amethyst/pantry-template?c=rep-bling-kitchen&amp;publicSiteSlug=blingkitchen',
    )
    expect(html).not.toContain('?c=blingkitchen')
  })
})
