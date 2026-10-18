import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveCustomerDomainSiteState = vi.fn()

vi.mock('@/lib/amethyst/customer-domain-site', () => ({
  resolveCustomerDomainSiteState: (...args: unknown[]) =>
    resolveCustomerDomainSiteState(...args),
  renderCustomerSiteNotFoundResponse: () => new Response('Not found', { status: 404 }),
  renderCustomerSiteUnavailableResponse: () =>
    new Response('unavailable', { status: 503 }),
}))

vi.mock('@/lib/amethyst/customer-faq', () => ({
  renderCustomerFaq: vi.fn(async (_request: Request, options: { repId: string }) => {
    return new Response(`faq ${options.repId}`, { status: 200 })
  }),
}))

import { GET, readCustomerFaqRepKey } from '@/app/customer-site/faq/route'

describe('customer FAQ rep handoff', () => {
  beforeEach(() => {
    resolveCustomerDomainSiteState.mockReset()
  })

  it('reads the rep from the rewrite URL when the original request has no query', () => {
    const request = new Request('https://preview.vercel.app/faq', {
      headers: {
        host: 'preview.vercel.app',
        'x-middleware-rewrite':
          'https://preview.vercel.app/customer-site/faq?c=brittwithbling.com',
      },
    })

    expect(readCustomerFaqRepKey(request)).toBe('brittwithbling.com')
  })

  it('reads the rep from Host when the rewrite query does not reach the route', () => {
    const request = new Request('https://brittwithbling.com/faq', {
      headers: { host: 'brittwithbling.com' },
    })

    expect(readCustomerFaqRepKey(request)).toBe('brittwithbling.com')
  })

  it('serves the rep FAQ from the rewrite param', async () => {
    resolveCustomerDomainSiteState.mockResolvedValue({
      kind: 'serve',
      host: 'brittwithbling.com',
      repId: 'rep-britt',
    })

    const response = await GET(
      new Request('https://preview.vercel.app/faq', {
        headers: {
          'x-middleware-rewrite':
            'https://preview.vercel.app/customer-site/faq?c=brittwithbling.com',
        },
      }),
    )

    expect(resolveCustomerDomainSiteState).toHaveBeenCalledWith('brittwithbling.com')
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('faq rep-britt')
  })

  it('returns 404 when the host is not a rep domain and no rep param arrived', async () => {
    resolveCustomerDomainSiteState.mockResolvedValue({ kind: 'not_customer_host' })

    const response = await GET(
      new Request('https://www.yoursparklesuite.com/customer-site/faq', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )

    expect(response.status).toBe(404)
  })
})
