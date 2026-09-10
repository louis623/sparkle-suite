import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CommunicationsConsole } from '@/app/control-center/_components/CommunicationsConsole'

describe('CommunicationsConsole', () => {
  it('renders the read-only Broadcasts compose and preview workflow', () => {
    const html = renderToStaticMarkup(createElement(CommunicationsConsole))

    expect(html).toContain('Broadcasts')
    expect(html).toContain('Broadcasts are read-only')
    expect(html).toContain('Save draft')
    expect(html).toContain('Review &amp; publish')
    expect(html).toContain('Review the frozen audience, then use')
    expect(html).toContain('Publish now')
    expect(html).toContain('Safe preview')
    expect(html).toContain('Post as')
    expect(html).toContain('Nic-Nac')
    expect(html).toContain('All active reps')
    expect(html).toContain('Selected reps')
    expect(html).toContain('Publication history')
    expect(html).toContain('In-app only')
    expect(html).not.toContain('Send email')
    expect(html).not.toContain('Send SMS')
    expect(html).not.toContain('Reply')
  })

  it('offers all supported message categories and priorities', () => {
    const html = renderToStaticMarkup(createElement(CommunicationsConsole))

    expect(html).toContain('Business update')
    expect(html).toContain('Monthly report')
    expect(html).toContain('Customer activity')
    expect(html).toContain('Help update')
    expect(html).toContain('Blog')
    expect(html).toContain('Video')
    expect(html).toContain('Action required')
  })
})
