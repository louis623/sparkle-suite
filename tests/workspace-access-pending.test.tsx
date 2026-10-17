import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { WorkspaceAccessPending } from '@/app/nic-nac/components/WorkspaceAccessPending'

describe('WorkspaceAccessPending', () => {
  it('shows checkout as the only step before the first payment', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceAccessPending, { status: 'checkout_required' }),
    )

    expect(html).toContain('Finish checkout to open your workspace')
    expect(html).toContain(
      'Your account can sign in now. The workspace opens after your first payment goes through.',
    )
    expect(html).toContain('Continue to checkout')
    expect(html).toContain('type="checkbox"')
    expect(html).not.toMatch(/trial/i)
  })

  it('waits when payment is still being confirmed', () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceAccessPending, { status: 'payment_pending' }),
    )

    expect(html).toContain('Payment is still being confirmed')
    expect(html).toContain('No new checkout will start automatically.')
    expect(html).not.toContain('Continue to checkout')
    expect(html).not.toMatch(/trial/i)
  })
})
