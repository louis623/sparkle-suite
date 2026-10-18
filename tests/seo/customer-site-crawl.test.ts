import { describe, expect, it } from 'vitest'

import {
  buildCustomerSiteLlmsText,
  buildCustomerSiteSitemap,
  renderCustomerSiteSitemapXml,
} from '@/lib/seo/customer-site-crawl'

const kim = {
  businessName: 'Go for the Bling',
  repName: 'Kim',
  summary: "Kim's live jewelry community.",
  showJoinPage: true,
  showPantryPage: false,
  repLocation: 'Ohio',
}

describe('customer-site crawl content', () => {
  it('uses the customer domain and only the routes that customer publishes', () => {
    expect(buildCustomerSiteSitemap('https://goforthebling.com', kim)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://goforthebling.com/', priority: 1 }),
        expect.objectContaining({ url: 'https://goforthebling.com/trade' }),
        expect.objectContaining({ url: 'https://goforthebling.com/join' }),
        expect.objectContaining({ url: 'https://goforthebling.com/faq' }),
      ]),
    )
    expect(buildCustomerSiteSitemap('https://goforthebling.com', kim)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: expect.stringContaining('prelaunch') }),
        expect.objectContaining({ url: expect.stringContaining('in-the-pantry') }),
      ]),
    )
  })

  it('serializes a customer sitemap without platform or demo URLs', () => {
    const xml = renderCustomerSiteSitemapXml('https://goforthebling.com', kim)
    expect(xml).toContain('<loc>https://goforthebling.com/</loc>')
    expect(xml).toContain('<loc>https://goforthebling.com/join</loc>')
    expect(xml).toContain('<loc>https://goforthebling.com/faq</loc>')
    expect(xml).not.toContain('yoursparklesuite.com/prelaunch')
  })

  it('renders actual customer identity rather than the demo llms fallback', () => {
    const llms = buildCustomerSiteLlmsText('https://goforthebling.com', kim)
    expect(llms).toContain('# Go for the Bling')
    expect(llms).toContain('Rep: Kim')
    expect(llms).toContain('https://goforthebling.com/trade')
    expect(llms).toContain('https://goforthebling.com/faq')
    expect(llms).toContain(
      'Go for the Bling is an independent Bomb Party rep. This site is not affiliated with or endorsed by Bomb Party.',
    )
    expect(llms).toContain('request a dancer swap')
    expect(llms).not.toMatch(/trade listings|fair trades/i)
    expect(llms).not.toContain("Jane's Sparkle Party")
  })

  it('prints upcoming shows from the supplied calendar instead of an empty schedule', () => {
    const llms = buildCustomerSiteLlmsText('https://sparklybutterflies.com', {
      ...kim,
      businessName: 'Sparkly Butterflies',
      liveShows: [
        { title: 'TikTok live reveal', eventTime: 'Sun, Oct 18, 12:00 PM MST' },
      ],
    })
    expect(llms).toContain('TikTok live reveal: Sun, Oct 18, 12:00 PM MST')
    expect(llms).not.toContain('No upcoming public live shows')
  })

  it('writes customer sitemap and llms URLs on the apex when the request host is www', () => {
    const sitemap = buildCustomerSiteSitemap('https://www.goforthebling.com/sitemap.xml', kim)
    expect(sitemap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://goforthebling.com/' }),
        expect.objectContaining({ url: 'https://goforthebling.com/trade' }),
      ]),
    )
    expect(sitemap.some((entry) => entry.url.includes('://www.'))).toBe(false)

    const xml = renderCustomerSiteSitemapXml('https://www.brittwithbling.com', kim)
    expect(xml).toContain('<loc>https://brittwithbling.com/</loc>')
    expect(xml).not.toContain('www.brittwithbling.com')

    const llms = buildCustomerSiteLlmsText('https://www.sparklybutterflies.com', kim)
    expect(llms).toContain('https://sparklybutterflies.com/trade')
    expect(llms).not.toContain('www.sparklybutterflies.com')
  })
})
