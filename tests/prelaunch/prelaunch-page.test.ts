import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
const { readAvailability } = vi.hoisted(() => ({ readAvailability: vi.fn() }))
vi.mock('@/lib/sparkle-suite/live-founder-availability', () => ({ readLandingFounderAvailability: readAvailability }))
import PrelaunchPage, { metadata } from '@/app/prelaunch/page'
import { PrelaunchWaitlistForm } from '@/app/prelaunch/_components/PrelaunchWaitlistForm'
import { prelaunchContent } from '@/lib/prelaunch/content'

const renderIntake = async () => renderToStaticMarkup(await PrelaunchPage())
beforeEach(() => readAvailability.mockResolvedValue({ status: 'unavailable', remaining: null, checkedAt: null }))

describe('Sparkle Suite build-queue intake', () => {
  it('explains the call and payment sequence before the form', async () => {
    const html = await renderIntake()
    expect(html).toContain('Let’s talk about your site.')
    expect(html).toContain('Join the build queue')
    expect(html).toContain('quick 30-minute call')
    expect(html).toContain('Your build starts once your first month and setup fee are paid.')
    expect(html).toContain('No payment when you join the queue.')
    expect(html).toContain('application/ld+json')
    for (const phrase of ['Coming Soon', 'Join the Waitlist', 'V1 preview', 'backend', 'Thank you, Louis Chapman', 'Your spot in line starts here.']) expect(html).not.toContain(phrase)
    expect(metadata.title).toEqual({ absolute: 'Join the build queue | Sparkle Suite' })
    expect(metadata.alternates?.canonical).toBe('/prelaunch')
  })

  it('preserves navigation, signup anchor, and legal destinations', async () => {
    const html = await renderIntake()
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    for (const href of ['/', '/portfolio', '/#pricing', '/faq']) expect(header).toContain(`href="${href}"`)
    expect(header).toContain('aria-label="Account links"')
    expect(html).toContain('href="#waitlist"')
    expect(html).toContain('id="waitlist"')
    expect(html).toContain('href="/privacy-policy"')
    expect(html).toContain('href="/terms-and-conditions"')
    expect(html).not.toContain('href="#"')
    const formSource = readFileSync(join(process.cwd(), 'app/prelaunch/_components/PrelaunchWaitlistForm.tsx'), 'utf8')
    expect(formSource).toContain("fetch('/api/prelaunch/waitlist'")
    expect(formSource.indexOf('if (!response.ok)')).toBeLessThan(formSource.indexOf('setIsSubmitted(true)'))
  })

  it('server-renders founder pricing without fabricated availability and keeps consent disclosures', async () => {
    const html = await renderIntake()
    expect(readAvailability).toHaveBeenCalled()
    expect(html).toContain('aria-label="Sparkle Suite founding rep pricing"')
    expect(html).toContain('$49.99')
    expect(html).toContain('$99.98')
    expect(html).toContain('first 12 paid months')
    expect(html).not.toContain('$124.98')
    expect(html).not.toContain('founder spots remaining')
    expect(html).toContain('Joining the queue does not reserve founder pricing.')
    expect(html).toContain('Message frequency may vary')
    expect(html).toContain('Reply STOP to')
    expect(html).toContain('HELP for help')
    expect(html).toContain('not sold, rented, traded, or shared for third-party')
    expect(html).toContain('source and campaign label')
  })

  it('preserves intake fields, consent defaults, and an honest confirmation', () => {
    const html = renderToStaticMarkup(createElement(PrelaunchWaitlistForm))
    const field = (name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? ''
    expect(field('name')).toContain('required=""')
    expect(field('email')).toContain('required=""')
    for (const name of ['phone', 'tiktokHandle', 'teamRepName']) {
      expect(field(name)).not.toBe('')
      expect(field(name)).not.toContain('required=""')
    }
    expect(html).toContain('name="setupPain"')
    expect(field('website')).toContain('hidden=""')
    expect(field('smsConsent')).not.toContain('checked=""')
    expect(field('smsConsent')).not.toContain('required=""')
    expect(field('emailConsent')).toContain('checked=""')
    expect(field('emailConsent')).toContain('required=""')
    expect(html).toContain('Consent is not a condition of purchase.')
    expect(prelaunchContent.waitlistSuccessBody).toContain('quick 30-minute call')
    expect(prelaunchContent.waitlistSuccessBody).toContain('No payment has been taken.')
    expect(prelaunchContent.waitlistSuccessBody).toContain('does not reserve founder pricing')
    expect(prelaunchContent.waitlistSuccessBody).toContain('first month and setup fee are paid')
  })
})
