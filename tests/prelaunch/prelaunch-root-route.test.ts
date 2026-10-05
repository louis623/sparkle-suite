import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import Home from '@/app/page'
import { redirect } from 'next/navigation'

describe('root route', () => {
  it('renders the Suite and Finder combo without leaving /adventure in place', () => {
    const html = renderToStaticMarkup(createElement(Home))

    expect(redirect).not.toHaveBeenCalled()
    expect(html).toContain('Now Pick Your Shine')
    expect(html).toContain('data-path="suite"')
    expect(html).toContain('data-path="finder"')
    expect(html).not.toContain('/adventure')
  })
})
