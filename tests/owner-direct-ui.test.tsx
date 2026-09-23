import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { OwnerDirectMessages } from '@/app/control-center/_components/OwnerDirectMessages'

describe('owner direct message UI', () => {
  it('renders the owner-only entry point without exposing a composer before a rep is chosen', () => {
    const html = renderToStaticMarkup(createElement(OwnerDirectMessages))

    expect(html).toContain('Private, two-way conversations with one rep at a time')
    expect(html).toContain('Search conversations')
    expect(html).toContain('New message')
    expect(html).toContain('Choose a conversation or start a new message to an active rep.')
    expect(html).not.toContain('Send privately')
  })
})
