import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NeedsYouStrip } from '@/app/nic-nac/components/dance-floor/NeedsYouStrip'
import { getDanceFloorAttention } from '@/lib/services/trade-board'
const render = (props: Partial<Parameters<typeof NeedsYouStrip>[0]> = {}) => renderToStaticMarkup(createElement(NeedsYouStrip, { requests: 2, followUps: 0, photos: 1, status: 'ready', onRetry() {}, ...props }))
describe('Needs you first', () => {
  it('links positive counts to the three targets and keeps zero neutral/disabled', () => {
    const html = render()
    expect(html).toContain('href="#requests"'); expect(html).toContain('href="#floor"')
    expect(html).not.toContain('href="#follow-ups"'); expect(html).toContain('aria-disabled="true"')
    expect(readFileSync('app/nic-nac/components/dance-floor/NeedsYouStrip.tsx','utf8')).toContain("new Event('dance-floor-needs-photo')")
    expect(html).toContain('2 waiting'); expect(html).toContain('1 need a photo')
  })
  it('replaces all-zero with caught-up and uses exact loading/error copy', () => {
    const empty = render({ requests: 0, followUps: 0, photos: 0 })
    expect(empty).toContain('You&#x27;re all caught up.'); expect(empty).not.toContain('href=')
    expect(empty).toContain('No new requests, follow-ups, or missing photos.')
    expect(render({ status: 'loading' })).toContain('Checking your Dance Floor…')
    expect(render({ status: 'loading' }).match(/>–</g)).toHaveLength(3)
    expect(render({ status: 'error' })).toContain('Couldn&#x27;t refresh this list.')
    expect(render({ status: 'error' })).toContain('Try again')
  })
  it('renders the real service count for missing dancer 25 rather than the displayed page', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), listing_source: 'non_item_number', manual_photo_url: i === 24 ? null : '/photo.jpg' }))
    const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, range: () => Promise.resolve({ data: rows, error: null }) }
    const attention = await getDanceFloorAttention({ from: () => q } as never, 'rep')
    expect(attention.photosToFix).toBe(1)
    const html = render({ photos: attention.photosToFix })
    expect(html).toMatch(/href="#floor"[\s\S]*?>1<\/strong>[\s\S]*?Photos to fix/)
  })
})
