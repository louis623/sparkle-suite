import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NeedsYouStrip } from '@/app/nic-nac/components/dance-floor/NeedsYouStrip'
import { getDanceFloorAttention } from '@/lib/services/trade-board'
const render = (props: Partial<Parameters<typeof NeedsYouStrip>[0]> = {}) => renderToStaticMarkup(createElement(NeedsYouStrip, { requests: 2, followUps: 0, status: 'ready', onRetry() {}, ...props }))
describe('Needs you first', () => {
  it('links positive counts to the two targets and keeps zero neutral/disabled', () => {
    const html = render()
    expect(html).toContain('href="#requests"'); expect(html).not.toContain('href="#floor"')
    expect(html).not.toContain('href="#follow-ups"'); expect(html).toContain('aria-disabled="true"')
    expect(readFileSync('app/nic-nac/components/dance-floor/NeedsYouStrip.tsx','utf8')).not.toContain("dance-floor-needs-photo")
    expect(html).toContain('2 waiting'); expect(html).not.toContain('need a photo')
  })
  it('replaces all-zero with caught-up and uses exact loading/error copy', () => {
    const empty = render({ requests: 0, followUps: 0 })
    expect(empty).toContain('You&#x27;re all caught up.'); expect(empty).not.toContain('href=')
    expect(empty).toContain('No new requests or follow-ups.')
    expect(render({ status: 'loading' })).toContain('Checking your Dance Floor…')
    expect(render({ status: 'loading' }).match(/>–</g)).toHaveLength(2)
    expect(render({ status: 'error' })).toContain('Couldn&#x27;t refresh this list.')
    expect(render({ status: 'error' })).toContain('Try again')
  })
  it('all-clear does not depend on missing photos', async () => {
    const q: any = { select: () => q, eq: () => q, in: () => q, order: () => q, range: () => Promise.resolve({ data: [], error: null }) }
    expect(await getDanceFloorAttention({ from: () => q } as never, 'rep')).toEqual({ sitting: 0 })
    expect(render({ requests: 0, followUps: 0 })).toContain('all caught up')
  })
})
