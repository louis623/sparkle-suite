import { describe, expect, it } from 'vitest'
import { getRedirectUrl, getRewrittenUrl, isRewrite } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'

import nextConfig from '@/next.config'
import { config, proxy } from '@/proxy'

type ConfigRedirect = {
  source: string
  destination: string
  statusCode?: number
  has?: Array<{ type: string; value?: string }>
}

function configRedirectFor(request: NextRequest, redirects: ConfigRedirect[]) {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  for (const redirect of redirects) {
    const matched = getPathMatch(redirect.source, { strict: true })(request.nextUrl.pathname)
    if (!matched) continue
    const hostRules = (redirect.has ?? []).filter((item) => item.type === 'host')
    if (
      hostRules.length > 0 &&
      !hostRules.some((item) => !item.value || new RegExp(`^(?:${item.value})$`, 'i').test(host))
    ) {
      continue
    }
    return redirect
  }
  return null
}

describe('custom-domain customer site proxy', () => {
  it.each([
    ['/', '/customer-site/home'],
    ['/trade', '/customer-site/trade'],
    ['/faq', '/customer-site/faq'],
    ['/join', '/customer-site/join'],
    ['/in-the-pantry', '/customer-site/in-the-pantry'],
  ])('rewrites %s to its customer-site asset on a custom domain', (path, assetPath) => {
    const response = proxy(
      new NextRequest(`https://brisglowtique.com${path}`, {
        headers: { host: 'brisglowtique.com' },
      }),
    )

    expect(isRewrite(response)).toBe(true)
    expect(getRewrittenUrl(response)).toBe(
      `https://brisglowtique.com${assetPath}?c=brisglowtique.com`,
    )
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      `https://brisglowtique.com${assetPath}?c=brisglowtique.com`,
    )
    expect(response.headers.get('x-sparkle-customer-domain')).toBeNull()
  })

  it('keeps the Suite host /faq page for marketing and preserves rep previews', () => {
    const marketing = proxy(
      new NextRequest('https://www.yoursparklesuite.com/faq', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    const preview = proxy(
      new NextRequest('https://www.yoursparklesuite.com/faq?c=rep-1', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )

    expect(isRewrite(marketing)).toBe(false)
    expect(isRewrite(preview)).toBe(true)
    expect(getRewrittenUrl(preview)).toBe(
      'https://www.yoursparklesuite.com/internal/customer-faq-preview?c=rep-1',
    )
  })

  it('leaves the Sparkle Suite platform host alone', () => {
    const response = proxy(
      new NextRequest('https://www.yoursparklesuite.com/', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )

    expect(isRewrite(response)).toBe(false)
  })

  it('permanently consolidates a customer www host onto its apex domain', () => {
    const response = proxy(
      new NextRequest('https://www.brisglowtique.com/join?source=search', {
        headers: { host: 'www.brisglowtique.com' },
      }),
    )

    expect(response.status).toBe(308)
    expect(getRedirectUrl(response)).toBe(
      'https://brisglowtique.com/join?source=search',
    )
    expect(isRewrite(response)).toBe(false)
  })

  it('removes a caller-supplied internal tenant header before platform routing', () => {
    const response = proxy(
      new NextRequest('https://www.yoursparklesuite.com/api/amethyst/join-template', {
        headers: {
          host: 'www.yoursparklesuite.com',
          'x-sparkle-customer-domain': 'theblingkitchen.com',
        },
      }),
    )

    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it.each([
    ['/sitemap.xml', 'https://brisglowtique.com/sitemap.xml'],
    ['/robots.txt', 'https://brisglowtique.com/robots.txt'],
    ['/amethyst/homepage.css', 'https://brisglowtique.com/amethyst/homepage.css'],
    ['/amethyst/homepage.jsx', 'https://brisglowtique.com/amethyst/homepage.jsx'],
    ['/favicon.ico', 'https://brisglowtique.com/favicon.ico'],
  ])('redirects www %s to the same apex path', (path, destination) => {
    const response = proxy(
      new NextRequest(`https://www.brisglowtique.com${path}?ref=crawl`, {
        headers: { host: 'www.brisglowtique.com' },
      }),
    )

    expect(response.status).toBe(308)
    expect(getRedirectUrl(response)).toBe(`${destination}?ref=crawl`)
  })

  it.each([
    ['/amethyst/Homepage.html', 'https://sparklybutterflies.com/'],
    ['/amethyst/Trade.html', 'https://sparklybutterflies.com/trade'],
    ['/amethyst/Join.html', 'https://sparklybutterflies.com/'],
    ['/amethyst/Pantry.html', 'https://sparklybutterflies.com/'],
    ['/amethyst/Unsubscribe.html', 'https://sparklybutterflies.com/'],
    ['/amethyst/Amethyst%20Design%20System.html', 'https://sparklybutterflies.com/'],
  ])('redirects legacy %s on a customer www host straight to the apex live path', (_path, destination) => {
    const response = proxy(
      new NextRequest(`https://www.sparklybutterflies.com${_path}`, {
        headers: { host: 'www.sparklybutterflies.com' },
      }),
    )

    expect(response.status).toBe(308)
    expect(getRedirectUrl(response)).toBe(destination)
  })

  it('keeps Suite www in place and sends legacy HTML home', () => {
    const home = proxy(
      new NextRequest('https://www.yoursparklesuite.com/', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    const legacyHome = proxy(
      new NextRequest('https://www.yoursparklesuite.com/amethyst/Homepage.html?c=demo', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    const legacyTrade = proxy(
      new NextRequest('https://www.yoursparklesuite.com/amethyst/Trade.html', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )
    const stylesheet = proxy(
      new NextRequest('https://www.yoursparklesuite.com/amethyst/homepage.css', {
        headers: { host: 'www.yoursparklesuite.com' },
      }),
    )

    expect(getRedirectUrl(home)).toBeNull()
    expect(legacyHome.status).toBe(308)
    expect(getRedirectUrl(legacyHome)).toBe('https://www.yoursparklesuite.com/?c=demo')
    expect(legacyTrade.status).toBe(308)
    expect(getRedirectUrl(legacyTrade)).toBe('https://www.yoursparklesuite.com/')
    expect(isRewrite(stylesheet)).toBe(false)
    expect(stylesheet.status).not.toBe(308)
  })

  it('matches sitemap, robots, and legacy HTML while skipping Next internals', () => {
    const pattern = config.matcher[0]
    expect(pattern).toBe('/((?!_next/static|_next/image).*)')
    const expression = new RegExp(`^${pattern}$`)
    expect(expression.test('/sitemap.xml')).toBe(true)
    expect(expression.test('/robots.txt')).toBe(true)
    expect(expression.test('/amethyst/Homepage.html')).toBe(true)
    expect(expression.test('/amethyst/homepage.css')).toBe(true)
    expect(expression.test('/')).toBe(true)
    expect(expression.test('/_next/static/chunk.js')).toBe(false)
    expect(expression.test('/_next/image')).toBe(false)
  })

  it('301s Britt legacy URLs to the closest current page on the apex', () => {
    const cases = [
      ['/about', 'https://brittwithbling.com/?ref=search#about'],
      ['/diamonds-unicorns/', 'https://brittwithbling.com/?ref=search#wibp'],
      ['/join-team', 'https://brittwithbling.com/join?ref=search'],
      ['/embed', 'https://brittwithbling.com/?ref=search'],
    ] as const

    for (const [path, destination] of cases) {
      const response = proxy(
        new NextRequest(`https://www.brittwithbling.com${path}?ref=search`, {
          headers: { host: 'www.brittwithbling.com' },
        }),
      )
      expect(response.status).toBe(301)
      expect(getRedirectUrl(response)).toBe(destination)
    }
  })

  it('keeps Britt legacy paths off other rep hosts', () => {
    const response = proxy(
      new NextRequest('https://milehighfizz.com/about', {
        headers: { host: 'milehighfizz.com' },
      }),
    )
    expect(response.status).not.toBe(301)
    expect(isRewrite(response)).toBe(false)
  })

  it('runs next.config redirects before the proxy, so rep /demo stays a 404', async () => {
    const redirects = ((await nextConfig.redirects?.()) ?? []) as ConfigRedirect[]
    const rep = new NextRequest('https://brittwithbling.com/demo', {
      headers: { host: 'brittwithbling.com' },
    })
    const learn = new NextRequest('https://brittwithbling.com/learn', {
      headers: { host: 'brittwithbling.com' },
    })
    const suite = new NextRequest('https://www.yoursparklesuite.com/demo?ref=nav', {
      headers: { host: 'www.yoursparklesuite.com' },
    })
    const apex = new NextRequest('https://yoursparklesuite.com/demo', {
      headers: { host: 'yoursparklesuite.com' },
    })

    expect(configRedirectFor(learn, redirects)).toMatchObject({
      source: '/learn',
      destination: '/',
      statusCode: 301,
    })
    expect(configRedirectFor(rep, redirects)).toBeNull()
    expect(configRedirectFor(suite, redirects)).toBeNull()

    const repResponse = proxy(rep)
    expect(repResponse.status).toBe(404)
    expect(getRedirectUrl(repResponse)).toBeNull()

    const suiteResponse = proxy(suite)
    expect(suiteResponse.status).toBe(301)
    expect(getRedirectUrl(suiteResponse)).toBe(
      'https://www.yoursparklesuite.com/?ref=nav#watch',
    )
    const apexResponse = proxy(apex)
    expect(apexResponse.status).toBe(301)
    expect(getRedirectUrl(apexResponse)).toBe('https://yoursparklesuite.com/#watch')
  })

  it('returns 404 for Suite marketing pages on a rep host and leaves the Suite host alone', () => {
    for (const path of ['/portfolio', '/tools', '/prelaunch/intake', '/adventure', '/demo']) {
      const rep = proxy(
        new NextRequest(`https://brittwithbling.com${path}`, {
          headers: { host: 'brittwithbling.com' },
        }),
      )
      expect(rep.status).toBe(404)
      expect(isRewrite(rep)).toBe(false)

      const suite = proxy(
        new NextRequest(`https://www.yoursparklesuite.com${path}`, {
          headers: { host: 'www.yoursparklesuite.com' },
        }),
      )
      expect(suite.status).not.toBe(404)
      expect(isRewrite(suite)).toBe(false)
    }
  })

  it('leaves non-customer-site routes and Amethyst assets alone on the apex', () => {
    const login = proxy(
      new NextRequest('https://brisglowtique.com/login', {
        headers: { host: 'brisglowtique.com' },
      }),
    )
    const stylesheet = proxy(
      new NextRequest('https://brisglowtique.com/amethyst/homepage.css', {
        headers: { host: 'brisglowtique.com' },
      }),
    )
    const trade = proxy(
      new NextRequest('https://milehighfizz.com/amethyst/Trade.html?collection=OG', {
        headers: { host: 'milehighfizz.com' },
      }),
    )

    expect(isRewrite(login)).toBe(false)
    expect(login.status).not.toBe(308)
    expect(stylesheet.status).not.toBe(308)
    expect(trade.status).toBe(308)
    expect(getRedirectUrl(trade)).toBe('https://milehighfizz.com/trade?collection=OG')
  })
})
