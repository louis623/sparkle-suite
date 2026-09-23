import { describe, expect, it } from 'vitest'

import { defaultAmethystHomepageEvents } from '@/lib/amethyst/homepage-upcoming-shows'
import {
  applyCustomDomainToHomepageEvents,
  applyCustomDomainToTemplateData,
  applyPublicSiteSlugToHomepageEvents,
  applyPublicSiteSlugToTemplateData,
  getPublicSiteSlugFromRequest,
} from '@/lib/amethyst/public-site-links'
import { DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import {
  applyCustomDomainToPantryTemplateData,
  defaultAmethystPantryTemplateData,
} from '@/lib/amethyst/pantry-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'

describe('Amethyst public site slug links', () => {
  it('normalizes valid slugs and rejects invalid slugs from template requests', () => {
    expect(
      getPublicSiteSlugFromRequest(
        new Request('https://www.yoursparklesuite.com/api/amethyst/homepage-template?publicSiteSlug=MileHighFizz'),
      ),
    ).toBe('milehighfizz')

    expect(
      getPublicSiteSlugFromRequest(
        new Request('https://www.yoursparklesuite.com/api/amethyst/homepage-template?publicSiteSlug=mile-high-fizz'),
      ),
    ).toBeNull()
  })

  it('rewrites customer-facing home, trade, and event collection links to the slug routes', () => {
    const data = applyPublicSiteSlugToTemplateData(
      {
        appearancePreset: DEFAULT_AMETHYST_APPEARANCE_PRESET,
        homepage: defaultAmethystHomepageTemplateData,
        trade: defaultAmethystTradeTemplateData,
        join: defaultAmethystJoinTemplateData,
      },
      'milehighfizz',
    )
    const events = applyPublicSiteSlugToHomepageEvents(
      defaultAmethystHomepageEvents,
      'milehighfizz',
    )

    expect(data.homepage.footerLinks.home).toBe('/milehighfizz')
    expect(data.homepage.footerLinks.tradeBoard).toBe('/milehighfizz/trade')
    expect(data.homepage.footerLinks.faq).toBe('/milehighfizz/faq')
    expect(data.trade.footerLinks.home).toBe('/milehighfizz')
    expect(data.trade.footerLinks.tradeBoard).toBe('/milehighfizz/trade')
    expect(data.trade.footerLinks.faq).toBe('/milehighfizz/faq')
    expect(data.trade.footerLinks.pastShows).toBe('/milehighfizz#events')
    expect(events[0].collections[0].href).toBe(
      '/milehighfizz/trade?collection=Citrine%20Sun%20Series',
    )
  })

  it('keeps every customer-site navigation path on a custom domain', () => {
    const data = applyCustomDomainToTemplateData(
      {
        appearancePreset: DEFAULT_AMETHYST_APPEARANCE_PRESET,
        homepage: {
          ...defaultAmethystHomepageTemplateData,
          pantryPageUrl: '/blingkitchen/in-the-pantry',
        },
        trade: {
          ...defaultAmethystTradeTemplateData,
          pantryPageUrl: '/blingkitchen/in-the-pantry',
        },
        join: {
          ...defaultAmethystJoinTemplateData,
          pantryPageUrl: '/blingkitchen/in-the-pantry',
        },
      },
      'theblingkitchen.com',
    )
    const events = applyCustomDomainToHomepageEvents(
      defaultAmethystHomepageEvents,
      'theblingkitchen.com',
    )

    expect(data.homepage.joinTeamUrl).toBe('/join')
    expect(data.homepage.pantryPageUrl).toBe('/in-the-pantry')
    expect(data.homepage.footerLinks).toMatchObject({
      home: '/',
      tradeBoard: '/trade',
      faq: '/faq',
      joinTeam: '/join',
      pastShows: '/#events',
    })
    expect(data.trade.footerLinks).toMatchObject({
      home: '/',
      tradeBoard: '/trade',
      faq: '/faq',
      joinTeam: '/join',
      pastShows: '/#events',
    })
    expect(data.join.footerLinks).toMatchObject({
      home: '/',
      tradeBoard: '/trade',
      faq: '/faq',
      joinTeam: '/join',
      pastShows: '/#top',
    })
    expect(events[0].collections[0].href).toBe(
      '/trade?collection=Citrine%20Sun%20Series',
    )

    expect(
      applyCustomDomainToPantryTemplateData(
        defaultAmethystPantryTemplateData,
        'theblingkitchen.com',
      ).links,
    ).toMatchObject({
      home: '/',
      trade: '/trade',
      join: '/join',
      pantry: '/in-the-pantry',
      faq: '/faq',
    })
  })
})
