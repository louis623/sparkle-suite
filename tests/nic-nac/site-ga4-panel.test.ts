import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SiteGa4SummaryView } from '@/app/nic-nac/components/SiteVisitsPanel'

describe('site analytics panel', () => {
  it('shows an empty state instead of an error', () => {
    const notSetUp = renderToStaticMarkup(
      createElement(SiteGa4SummaryView, { view: { status: 'not_set_up' } }),
    )
    const unavailable = renderToStaticMarkup(
      createElement(SiteGa4SummaryView, { view: { status: 'unavailable' } }),
    )

    expect(notSetUp).toContain('Analytics not set up yet.')
    expect(unavailable).toContain('Analytics will show up here when the connection is ready.')
    expect(notSetUp).not.toContain('error')
    expect(unavailable).not.toContain('error')
  })

  it('shows the last 28 days and an Eastern update time', () => {
    const html = renderToStaticMarkup(
      createElement(SiteGa4SummaryView, {
        view: {
          status: 'ready',
          pageViews: 20,
          visitors: 5,
          topPages: [{ label: '/join', value: 2 }],
          sources: [{ label: 'direct', value: 4 }],
          devices: [{ label: 'Desktop', value: 4 }],
          updatedAt: '2026-10-17T14:13:00.000Z',
        },
      }),
    )

    expect(html).toContain('Page views')
    expect(html).toContain('Visitors')
    expect(html).toContain('Top pages')
    expect(html).toContain('Sources')
    expect(html).toContain('Devices')
    expect(html).toContain('Last 28 days.')
    expect(html).toContain('Updated Oct 17, 10:13 AM ET')
  })
})
