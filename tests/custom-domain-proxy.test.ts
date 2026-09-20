import { describe, expect, it } from 'vitest'
import { getRedirectUrl, getRewrittenUrl, isRewrite } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'

import { proxy } from '@/proxy'

describe('custom-domain customer site proxy', () => {
  it.each([
    ['/', '/customer-site/home'],
    ['/trade', '/customer-site/trade'],
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

  it('leaves non-customer-site routes alone', () => {
    const response = proxy(
      new NextRequest('https://brisglowtique.com/login', {
        headers: { host: 'brisglowtique.com' },
      }),
    )

    expect(isRewrite(response)).toBe(false)
  })
})
