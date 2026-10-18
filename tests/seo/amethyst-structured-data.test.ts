import { describe, expect, it } from 'vitest'

import {
  buildAmethystPublicPageJsonLd,
  serializeJsonLd,
} from '@/lib/seo/amethyst-structured-data'

describe('Amethyst structured data builders', () => {
  it('builds a rep-aware public page graph from fixture data', () => {
    const jsonLd = buildAmethystPublicPageJsonLd({
      origin: 'https://sparklebysasha.example/',
      path: '/amethyst/Homepage.html',
      title: 'Sparkle by Sasha - Live jewelry reveals',
      description: 'Live jewelry reveals every Tuesday.',
      repName: 'Sasha Patel',
      businessName: 'Sparkle by Sasha',
      repCity: 'Chicago',
      repState: 'Illinois',
      shopUrl: 'https://bombparty.com/?ref=sparklebysasha',
      sameAs: ['https://www.tiktok.com/@sparklebysasha'],
      events: [
        {
          title: 'Unicorn Magic Drop',
          description: 'Main live reveal',
          eventTime: '2099-11-12T20:00:00.000Z',
          durationMinutes: 60,
          url: 'https://www.tiktok.com/@sparklebysasha/live',
        },
      ],
    })

    expect(serializeJsonLd(jsonLd)).not.toContain('streetAddress')
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@graph']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          '@type': 'WebPage',
          '@id': 'https://sparklebysasha.example/amethyst/Homepage.html#webpage',
          name: 'Sparkle by Sasha - Live jewelry reveals',
        }),
        expect.objectContaining({
          '@type': 'Person',
          '@id': 'https://sparklebysasha.example/#rep',
          name: 'Sasha',
          sameAs: ['https://www.tiktok.com/@sparklebysasha'],
        }),
        expect.objectContaining({
          '@type': 'Person',
          address: expect.objectContaining({
            '@type': 'PostalAddress',
            addressLocality: 'Chicago',
            addressRegion: 'Illinois',
            addressCountry: 'US',
          }),
        }),
        expect.objectContaining({
          '@type': 'LocalBusiness',
          '@id': 'https://sparklebysasha.example/#local-business',
          name: 'Sparkle by Sasha',
          address: expect.objectContaining({
            '@type': 'PostalAddress',
            addressLocality: 'Chicago',
            addressRegion: 'Illinois',
            addressCountry: 'US',
          }),
          areaServed: expect.objectContaining({
            addressLocality: 'Chicago',
            addressRegion: 'Illinois',
          }),
        }),
        expect.objectContaining({
          '@type': 'ProfessionalService',
          '@id': 'https://sparklebysasha.example/#professional-service',
          brand: expect.objectContaining({
            name: 'Bomb Party',
          }),
        }),
        expect.objectContaining({
          '@type': 'Event',
          name: 'Unicorn Magic Drop',
          eventAttendanceMode:
            'https://schema.org/OnlineEventAttendanceMode',
        }),
      ]),
    )
  })

  it('serializes JSON-LD safely for script tags', () => {
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      name: '<script>alert("nope")</script>',
    })

    expect(serialized).not.toContain('<script>')
    expect(serialized).toContain('\\u003cscript>')
  })

  it('omits city and state when the public join template has no location', () => {
    const jsonLd = buildAmethystPublicPageJsonLd({
      origin: 'https://sparklebysasha.example/',
      path: '/',
      title: 'Sparkle by Sasha',
      description: 'Live jewelry reveals.',
      repName: 'Sasha',
      businessName: 'Sparkle by Sasha',
    })
    const serialized = serializeJsonLd(jsonLd)

    expect(serialized).not.toContain('addressLocality')
    expect(serialized).not.toContain('streetAddress')
    expect(serialized).not.toContain('founderSequence')
  })
})
