import { createElement, isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { RequestCard, RequestInbox } from '@/app/nic-nac/components/dance-floor/RequestInbox'
import { requestCardAge, requestTiming } from '@/lib/nic-nac/swap-request-display'
import type { TradeRequestWithListing } from '@/lib/services/types'
const now = Date.parse('2026-11-15T12:00:00Z')
const request = { id: 'r', status: 'pending', customerName: 'Synthetic customer', createdAt: '2026-11-15T10:00:00Z', offeredType: 'RG', offeredFamily: 'Birthday', pendingPosition: 2, screening: { status: 'likely_match' }, listing: { design: { designName: 'Test ring' } } } as TradeRequestWithListing
function buttons(node: ReactNode): Array<any> {
  if (Array.isArray(node)) return node.flatMap(buttons)
  if (!isValidElement<{ children?: ReactNode }>(node)) return []
  return [...(node.type === 'button' ? [node] : []), ...buttons(node.props.children)]
}
describe('request cards only open review', () => {
  it('Approve and Deny invoke matching callbacks and never a decision fetch', () => {
    const callback = vi.fn(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const tree = RequestCard({ request, onReviewRequest: callback, now })
    const actions = buttons(tree)
    actions[0].props.onClick(); actions[1].props.onClick()
    expect(callback.mock.calls).toEqual([['r', 'approve'], ['r', 'reject']]); expect(fetch).not.toHaveBeenCalled()
    const source = readFileSync('app/nic-nac/components/dance-floor/RequestInbox.tsx', 'utf8')
    expect(source).not.toMatch(/fetch\(|method:\s*['"]POST/)
    vi.unstubAllGlobals()
  })
  it('disables both opening buttons with Opening… and no decision-in-progress copy', () => {
    const tree = RequestCard({ request, openingReview: { requestId: 'r', action: 'reject' }, onReviewRequest() {}, now })
    expect(buttons(tree).every(button => button.props.disabled && button.props.children === 'Opening…')).toBe(true)
    const html = renderToStaticMarkup(tree)
    expect(html).not.toMatch(/Approving|Denying/)
    expect(html).toContain('data-opening-action="reject"')
  })
  it('renders expired/no-photo copy and only pending requests', () => {
    const plain = renderToStaticMarkup(createElement(RequestCard, { request, onReviewRequest() {}, now }))
    expect(plain).toContain('No screenshot attached'); expect(plain).toContain('Their reveal photo'); expect(plain).toContain('Your dancer')
    const expired = renderToStaticMarkup(createElement(RequestCard, { request: { ...request, photoExpired: true }, onReviewRequest() {}, now }))
    expect(expired).toContain('Photo expired after 7 days. Ask the customer to resend.')
    expect(plain).toContain('Pending #2 for this dancer'); expect(plain).toContain('Requested 2 hours ago')
    expect(renderToStaticMarkup(createElement(RequestInbox, { requests: [{ ...request, status: 'approved' }], status: 'ready', onRetry() {}, onReviewRequest() {} }))).toBe('')
  })
  it('formats age boundaries without changing review-screen requestTiming', () => {
    const age = (min: number) => requestCardAge(new Date(now - min * 60000).toISOString(), now)
    expect([age(0), age(59), age(60), age(120), age(2879), age(2880)]).toEqual(['Requested just now','Requested 59 min ago','Requested 1 hour ago','Requested 2 hours ago','Requested 47 hours ago','Requested 2 days ago'])
    expect(requestTiming(request.createdAt, null, now).age).toBe('Requested 120 min ago')
  })
})
