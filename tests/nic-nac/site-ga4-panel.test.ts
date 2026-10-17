import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SiteGa4SummaryView, SiteVisitsPanel } from '@/app/nic-nac/components/SiteVisitsPanel'
import { buildSiteTrafficLedger } from '@/lib/services/site-traffic'

const NOW = new Date('2026-12-17T18:00:00.000Z')

describe('site analytics panel', () => {
  it('shows a processing line instead of a zero or an error', () => {
    const notSetUp = renderToStaticMarkup(
      createElement(SiteGa4SummaryView, { view: { status: 'not_set_up' } }),
    )
    const unavailable = renderToStaticMarkup(
      createElement(SiteGa4SummaryView, { view: { status: 'unavailable' } }),
    )
    const processing = renderToStaticMarkup(
      createElement(SiteGa4SummaryView, { view: { status: 'processing' } }),
    )

    expect(notSetUp).toContain('Analytics not set up yet.')
    expect(unavailable).toContain('Analytics will show up here when the connection is ready.')
    expect(processing).toContain('Still processing, usually 24 to 48 hours')
    expect(processing).not.toContain('>0<')
    expect(notSetUp).not.toContain('error')
    expect(unavailable).not.toContain('error')
    expect(processing).not.toContain('error')
  })

  it('draws GA4 states and keeps page views as openings until unique counting is on', () => {
    const traffic = buildSiteTrafficLedger({
      now: NOW,
      timeZone: 'America/New_York',
      rows: [
        { viewed_at: '2026-12-17T15:00:00.000Z', src: 'qr', path: '/Join.html' },
        { viewed_at: '2026-12-17T16:00:00.000Z', src: 'deploycheck', path: '/Join.html' },
        { viewed_at: '2026-12-16T15:00:00.000Z', src: null, path: '/' },
      ],
    })
    const html = renderToStaticMarkup(
      createElement(SiteVisitsPanel, {
        traffic,
        now: NOW,
        ga4: {
          status: 'ready',
          sources: [{ label: 'google', value: 8 }, { label: 'tiktok', value: 12 }],
          regions: [
            { label: 'New York', value: 5 },
            { label: 'California', value: 2 },
            { label: 'Texas', value: 1 },
            { label: 'Florida', value: 1 },
            { label: 'Illinois', value: 1 },
            { label: 'Washington', value: 1 },
          ],
          cities: [{ label: 'Brooklyn, New York', value: 3 }],
          devices: [{ label: 'mobile', value: 9 }],
          newVisitors: 4,
          returningVisitors: 2,
          realtimeUsers: 0,
        },
      }),
    )

    expect(html).toContain('Page views')
    expect(html).toContain('Counts page openings, not people.')
    expect(html).toContain('Top 5 states')
    expect(html).toContain('New York, 5 visits')
    expect(html).toContain('Darker states sent you more visitors.')
    expect(html).toContain('Light = few visits. Dark = most visits.')
    expect(html).toContain('No one on your site this minute.')
    expect(html).not.toContain('deploycheck')
    const topStates = html.slice(html.indexOf('data-testid="top-states"'), html.indexOf('</ol>', html.indexOf('data-testid="top-states"')))
    expect(topStates).toContain('New York')
    expect(topStates).not.toContain('Washington')
  })
})
