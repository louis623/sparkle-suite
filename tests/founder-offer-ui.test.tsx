import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FounderAvailabilityProvider, FounderOffer, FounderSpotLabel, FounderStrip } from '@/app/_components/landing-interactions'
import type { FounderAvailability } from '@/lib/sparkle-suite/founder-availability'

const checkedAt = '2026-10-06T13:00:00.000Z'
function renderOffer(availability?: FounderAvailability, compact = false) {
  return renderToStaticMarkup(<FounderAvailabilityProvider initialAvailability={availability}><FounderOffer compact={compact} /></FounderAvailabilityProvider>)
}
function text(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
}

describe('customer-visible founder offer states', () => {
  it.each([19, 1])('shows the confirmed %i count with correct grammar and no reservation pressure', remaining => {
    const html = renderToStaticMarkup(<FounderAvailabilityProvider initialAvailability={{ status: 'available', remaining, checkedAt }}><FounderStrip /><FounderSpotLabel large /></FounderAvailabilityProvider>)
    expect(text(html)).toContain(`${remaining} founder ${remaining === 1 ? 'spot' : 'spots'} remaining.`)
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('href="#pricing"')
    expect(text(html)).not.toMatch(/of 20|secure|reserve/i)
  })

  it.each([19, 1])('server-renders the %i-slot founder price and the full payment schedule', remaining => {
    const html = renderOffer({ status: 'available', remaining, checkedAt })
    const copy = text(html)
    expect(html).toContain('Sparkle Suite founding rep pricing')
    expect(copy).toContain('$49.99/mo')
    expect(copy).toContain('for your first 12 paid months')
    expect(copy).toContain('Then$74.99/mo')
    expect(copy).toContain('One-time setup$49.99')
    expect(copy).toContain('First month + setup: $99.98')
    expect(copy).toContain('Paid after our call.')
    expect(copy).toContain('Founder pricing is available to reps who move forward after our call, while spots last.')
  })

  it('switches to standard only for confirmed full availability', () => {
    const html = renderOffer({ status: 'full', remaining: 0, checkedAt })
    const copy = text(html)
    expect(html).toContain('Sparkle Suite standard pricing')
    expect(copy).toContain('$74.99/mo')
    expect(copy).toContain('First month + setup: $124.98')
    expect(copy).toContain('Founder spots are filled.')
    expect(copy).not.toMatch(/founder spots? remaining|12 paid months|\$99\.98/)
  })

  it('keeps founder pricing on unconfirmed and missing first-load data, with no invented count or urgency', () => {
    for (const availability of [undefined, { status: 'unavailable', remaining: null, checkedAt: null } satisfies FounderAvailability]) {
      const html = renderOffer(availability)
      const copy = text(html)
      expect(copy).toContain('$49.99/mo')
      expect(copy).toContain('First month + setup: $99.98')
      expect(copy).toContain('while spots last')
      expect(copy).not.toMatch(/\d+ founder spots? remaining|spots are filled|\$124\.98/)
      expect(html).not.toContain('Sparkle Suite standard pricing')
    }
  })

  it.each([
    { status: 'available', remaining: 19, checkedAt },
    { status: 'full', remaining: 0, checkedAt },
    { status: 'unavailable', remaining: null, checkedAt: null },
  ] satisfies FounderAvailability[])('keeps joining separate from reserving and paying: $status', availability => {
    const html = renderOffer(availability)
    const copy = text(html)
    expect(copy).toContain('Joining the queue does not reserve founder pricing.')
    expect(copy).toContain('No payment when you join the queue.')
    expect(copy).toContain('30-minute call')
    expect(copy).toContain('Your build starts once your first month and setup fee are paid.')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).not.toMatch(/checkout\.stripe|buy\.stripe|create-checkout/)
    expect(copy).not.toContain('Eligibility is confirmed at checkout')
    const compact = renderOffer(availability, true)
    expect(text(compact)).toContain('Joining the queue does not reserve founder pricing.')
    expect(compact).not.toContain('href="/prelaunch#waitlist"')
  })
})
