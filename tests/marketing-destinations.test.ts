import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MarketingFooter } from '@/app/_components/landing-experience'
import { SparkleSuitePublicFooter } from '@/app/_components/sparkle-suite-public-chrome'
import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import {
  sparkleFinderMarketingHref,
} from '@/lib/sparkle-suite/marketing-destinations'
import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'

const liveFinderHref = 'https://yoursparklefinder.com'
const smokeFinderHref = 'https://sparkle-finder-smoke.vercel.app/learn'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Suite marketing destinations', () => {
  it('keeps the live Finder host unless a Smoke marker is set', () => {
    const contentHref = sparkleSuitePublicLandingContent.footer.socialLinks.find(
      (link) => link.label === 'Sparkle Finder',
    )?.href

    expect(contentHref).toBe(liveFinderHref)
    expect(sparkleFinderMarketingHref({})).toBe(liveFinderHref)
    expect(sparkleFinderMarketingHref({
      SPARKLE_ENVIRONMENT: 'production',
      NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production',
    })).toBe(liveFinderHref)
    expect(sparkleFinderMarketingHref({ SPARKLE_ENVIRONMENT: 'smoke' })).toBe(smokeFinderHref)
    expect(sparkleFinderMarketingHref({
      NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke',
    })).toBe(smokeFinderHref)
  })

  it('renders the live Finder cross-link on the public landing by default', () => {
    const html = renderToStaticMarkup(createElement(SparkleSuitePublicLanding))

    expect(html).toContain(`href="${liveFinderHref}"`)
    expect(html).not.toContain(smokeFinderHref)
  })

  it.each([
    ['SPARKLE_ENVIRONMENT', MarketingFooter],
    ['NEXT_PUBLIC_SPARKLE_ENVIRONMENT', SparkleSuitePublicFooter],
  ] as const)('points the Finder footer link at Finder Smoke when %s is smoke', (marker, Footer) => {
    vi.stubEnv(marker, 'smoke')

    const html = renderToStaticMarkup(createElement(Footer))

    expect(html).toContain('>Sparkle Finder<')
    expect(html).toContain(`href="${smokeFinderHref}"`)
    expect(html).not.toContain(`href="${liveFinderHref}"`)
  })
})
