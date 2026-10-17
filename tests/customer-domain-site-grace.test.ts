import { beforeEach, describe, expect, it, vi } from 'vitest'

type Status = 'active' | 'past_due' | 'cancelled' | 'canceled' | 'unpaid' | 'incomplete_expired' | null

const state = vi.hoisted(() => ({ status: null as string | null }))
const renderAssetMock = vi.hoisted(() => vi.fn())
const crawlMock = vi.hoisted(() => vi.fn())

const BRI = { id: 'rep-bri', email: 'bri@example.com' }

function fakeAdmin() {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: string) {
              return {
                maybeSingle: async () => {
                  if (table === 'reps') {
                    if (column === 'custom_domain' && value === 'brisglowtique.com') return { data: BRI, error: null }
                    return { data: null, error: null }
                  }
                  if (table === 'subscriptions') {
                    return { data: state.status ? { status: state.status } : null, error: null }
                  }
                  return { data: null, error: null }
                },
              }
            },
          }
        },
      }
    },
    rpc: vi.fn(),
  }
}

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeAdmin() }))
vi.mock('@/lib/amethyst/public-asset-response', () => ({
  renderAmethystPublicAssetResponse: renderAssetMock,
}))
vi.mock('@/lib/seo/customer-site-crawl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/seo/customer-site-crawl')>()),
  loadCustomerSiteCrawlData: crawlMock,
}))

import { GET as customerPage } from '@/app/customer-site/[page]/route'
import { GET as llms } from '@/app/llms.txt/route'
import { GET as sitemap } from '@/app/sitemap.xml/route'
import { resolveCustomerDomainSiteState } from '@/lib/amethyst/customer-domain-site'
import { canServePublicCustomerSiteForRep, resolveWorkspaceAccess } from '@/lib/services/workspace-access'

const home = (host: string, c?: string) =>
  customerPage(new Request(`https://${host}/customer-site/home${c ? `?c=${c}` : ''}`), {
    params: Promise.resolve({ page: 'home' }),
  })
const crawlReq = (host: string, path: string) =>
  new Request(`https://${host}${path}`, { headers: { host } })

describe('public customer-site grace period for past_due', () => {
  beforeEach(() => {
    renderAssetMock.mockReset().mockResolvedValue(new Response('rep site'))
    crawlMock.mockReset().mockResolvedValue({
      businessName: "Bri's Glowtique", repName: 'Bri', summary: 'Live reveals',
      showJoinPage: false, showPantryPage: false, repLocation: '',
    })
  })

  it.each<[Status, boolean]>([
    ['active', true],
    ['past_due', true],
    ['cancelled', false],
    ['canceled', false],
    ['unpaid', false],
    ['incomplete_expired', false],
    [null, false],
  ])('public site access for %s is %s', async (status, allowed) => {
    state.status = status
    const supabase = fakeAdmin() as never
    expect(await canServePublicCustomerSiteForRep({ supabase, repId: BRI.id })).toBe(allowed)
  })

  it('keeps workspace access denied for past_due (grace is public-site only)', async () => {
    state.status = 'past_due'
    const access = await resolveWorkspaceAccess({ supabase: fakeAdmin() as never, repId: BRI.id })
    expect(access.hasFullAccess).toBe(false)
  })

  it.each(['active', 'past_due'])('serves the real rep site on the custom domain when %s', async (status) => {
    state.status = status
    const response = await home('www.yoursparklesuite.com', 'brisglowtique.com')
    expect(await response.text()).toBe('rep site')
    expect(renderAssetMock).toHaveBeenCalledOnce()
    expect((await llms(crawlReq('brisglowtique.com', '/llms.txt'))).status).toBe(200)
    const xml = await (await sitemap(crawlReq('brisglowtique.com', '/sitemap.xml'))).text()
    expect(xml).toContain('https://brisglowtique.com/')
    expect(xml).not.toContain('/portfolio')
  })

  it('shows a neutral noindex unavailable page when cancelled, never demo data', async () => {
    state.status = 'cancelled'
    const response = await home('www.yoursparklesuite.com', 'brisglowtique.com')
    const body = await response.text()
    expect(response.status).toBe(503)
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
    expect(body).toContain('This site is temporarily unavailable')
    expect(body).not.toMatch(/Sasha|Jane/)
    expect(renderAssetMock).not.toHaveBeenCalled()

    for (const path of ['/llms.txt', '/sitemap.xml']) {
      const handler = path === '/llms.txt' ? llms : sitemap
      const res = await handler(crawlReq('brisglowtique.com', path))
      expect(res.status).toBe(404)
      expect(res.headers.get('X-Robots-Tag')).toContain('noindex')
      expect(await res.text()).not.toMatch(/Sasha|Jane|portfolio/)
    }
    expect(crawlMock).not.toHaveBeenCalled()
  })

  it('treats an unmapped customer domain as unavailable instead of demo', async () => {
    state.status = 'active'
    expect(await resolveCustomerDomainSiteState('unknown-rep.com')).toEqual({ kind: 'unavailable', host: 'unknown-rep.com' })
    expect((await home('unknown-rep.com')).status).toBe(503)
  })

  it('keeps the Suite demo page and Suite crawl files on the Suite host', async () => {
    state.status = null
    expect(await resolveCustomerDomainSiteState('www.yoursparklesuite.com')).toEqual({ kind: 'not_customer_host' })
    const response = await home('www.yoursparklesuite.com')
    expect(await response.text()).toBe('rep site')
    expect(renderAssetMock).toHaveBeenCalledOnce()
    const xml = await (await sitemap(crawlReq('www.yoursparklesuite.com', '/sitemap.xml'))).text()
    expect(xml).toContain('https://www.yoursparklesuite.com/portfolio')
    expect((await llms(crawlReq('www.yoursparklesuite.com', '/llms.txt'))).status).toBe(200)
  })
})
