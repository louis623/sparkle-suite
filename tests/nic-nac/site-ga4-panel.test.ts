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
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="right-now-details"')
    expect(html).not.toContain('id="right-now-details"')
    const rightNow = html.slice(html.indexOf('data-testid="traffic-now"'), html.indexOf('data-testid="site-visits"'))
    expect(rightNow).toContain('<button')
    expect(rightNow).not.toContain('<a ')
    expect(html).not.toContain('deploycheck')
    const topStates = html.slice(html.indexOf('data-testid="top-states"'), html.indexOf('</ol>', html.indexOf('data-testid="top-states"')))
    expect(topStates).toContain('New York')
    expect(topStates).not.toContain('Washington')
  })

  it('does not show a QR-only source split as 100 percent while analytics is processing', () => {
    const traffic = buildSiteTrafficLedger({
      now: NOW,
      timeZone: 'America/New_York',
      rows: [
        { viewed_at: '2026-12-17T15:00:00.000Z', src: 'qr', path: '/' },
        { viewed_at: '2026-12-16T15:00:00.000Z', src: null, path: '/Join.html' },
      ],
    })
    const html = renderToStaticMarkup(
      createElement(SiteVisitsPanel, {
        traffic,
        now: NOW,
        ga4: { status: 'processing', realtimeUsers: null },
      }),
    )
    const sources = html.slice(html.indexOf('data-testid="traffic-sources"'), html.indexOf('data-testid="traffic-pages"'))
    expect(sources).toContain('Still processing, usually 24 to 48 hours')
    expect(sources).toContain('QR cards: 1 visit')
    expect(sources).not.toContain('100%')
    expect(sources).not.toContain('trafficFill')
  })

  it('follows the selected period and uses one chart label on a single day', () => {
    const now = new Date('2026-10-20T18:00:00.000Z')
    const traffic = buildSiteTrafficLedger({
      now,
      timeZone: 'America/New_York',
      rows: [{ viewed_at: '2026-10-17T16:00:00.000Z', path: '/' }],
    })
    const week = renderToStaticMarkup(
      createElement(SiteVisitsPanel, {
        traffic,
        now,
        initialPeriod: 'last-7',
        ga4: { status: 'processing', realtimeUsers: null },
      }),
    )
    expect(week).toContain('Who stopped by your site in the last 7 days.')
    expect(week).toContain('Your takeaway for the last 7 days')
    expect(week).toContain('Not enough counted days in the previous 7 days to compare yet.')
    expect(week).toContain('Times your Join my team page was opened in the last 7 days.')
    expect(week).not.toContain('Your takeaway this month')

    const firstDay = new Date('2026-10-17T18:00:00.000Z')
    const single = renderToStaticMarkup(
      createElement(SiteVisitsPanel, {
        traffic: buildSiteTrafficLedger({
          now: firstDay,
          timeZone: 'America/New_York',
          rows: [{ viewed_at: '2026-10-17T16:00:00.000Z', path: '/' }],
        }),
        now: firstDay,
        ga4: { status: 'processing', realtimeUsers: null },
      }),
    )
    const axis = single.slice(single.indexOf('data-testid="traffic-axis"'), single.indexOf('class="', single.indexOf('data-testid="traffic-axis"') + 10))
    expect(axis.match(/Oct 17/g)).toEqual(['Oct 17'])
    const dates = renderToStaticMarkup(
      createElement(SiteVisitsPanel, {
        traffic,
        now,
        initialPeriod: 'custom',
        ga4: { status: 'processing', realtimeUsers: null },
      }),
    )
    expect(dates).toContain('Not enough counted days before these dates to compare yet.')
    expect(dates).toContain('Who stopped by your site in this date range.')
    expect(dates).toContain('Your takeaway for these dates')
    expect(dates).toContain('Times your Join my team page was opened in this date range.')
  })
})
