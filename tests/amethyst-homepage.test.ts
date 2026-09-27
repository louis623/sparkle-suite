import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  defaultAmethystSiteContent,
  makeAmethystSiteContent,
} from '@/lib/amethyst/site-content'
import { AmethystHomepage } from '@/components/amethyst/amethyst-homepage'

describe('Amethyst homepage template', () => {
  it('renders the locked homepage shell and key export interactions from placeholder content', () => {
    const html = renderToStaticMarkup(
      createElement(AmethystHomepage, {
        content: defaultAmethystSiteContent,
      }),
    )

    expect(html).toContain('aria-label="Menu"')
    expect(html).toContain('Shop')
    expect(html).toContain('Watch Live')
    expect(html).toContain('Dance Floor')
    expect(html).toContain('Upcoming Shows')
    expect(html).toContain('It&#x27;s a live jewelry reveal')
    expect(html).toContain('Never miss a show.')
    expect(html).not.toContain('Want to do this too?')
    expect(html).toContain('Add to calendar')
    expect(html).not.toContain('aria-label="Open Nic-Nac"')
    expect(html).toContain(defaultAmethystSiteContent.businessName)
    expect(html).toContain(defaultAmethystSiteContent.repName)
    expect(html).toContain(defaultAmethystSiteContent.announcementItems[0])
    expect(html).toContain('First name')
    expect(html).toContain('Last name')
    expect(html).toContain('Email')
    expect(html).toContain('Phone')
    expect(html).toContain('sms_consent')
    expect(html).toContain('email_consent')
    expect(html).toContain('marketing_consent')
    expect(html).toContain('/amethyst/unsubscribe')
    expect(html).toContain('href="https://www.yoursparklesuite.com/"')
    expect(html).toContain('This site&#x27;s powered by Sparkle Suite')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).toContain('aria-label="TikTok"')
    expect(html).toContain('aria-label="Facebook"')
    expect(html).not.toContain('Bomb Party Catalog')
    expect(html).not.toContain('>Pre-orders<')
    expect(html).not.toContain('Past shows')
    expect(html).not.toContain('Hosting Soon')
    expect(html).not.toContain('>TT</a>')
    expect(html).not.toContain('>FB</a>')
    expect(html).not.toContain('Featured Dance Floor')
  })

  it('uses the supplied site content instead of hardcoded rep-specific strings', () => {
    const customContent = makeAmethystSiteContent({
      repName: 'Jordan Avery',
      businessName: 'Moonlit Velvet',
      heroHeadline: 'Custom reveals. Custom energy. Custom sparkle.',
      announcementItems: ['Text alerts every Friday'],
      footerColumn: {
        title: 'Next Drops',
        links: [{ label: 'Gemstone Weekend', href: '#events' }],
      },
    })

    const html = renderToStaticMarkup(
      createElement(AmethystHomepage, {
        content: customContent,
      }),
    )

    expect(html).toContain('Jordan')
    expect(html).not.toContain('Jordan Avery')
    expect(html).toContain('Moonlit Velvet')
    expect(html).toContain('Custom reveals. Custom energy. Custom sparkle.')
    expect(html).toContain('Text alerts every Friday')
    expect(html).not.toContain('Next Drops')
    expect(html).not.toContain('Gemstone Weekend')
    expect(html).not.toContain(defaultAmethystSiteContent.businessName)
  })
})
