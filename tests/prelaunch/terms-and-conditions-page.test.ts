import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import PrivacyPolicyPage from '@/app/privacy-policy/page'
import TermsAndConditionsPage, { metadata } from '@/app/terms-and-conditions/page'

describe('Sparkle Suite terms and conditions page', () => {
  it('renders the public terms with required SMS compliance language', async () => {
    const page = await TermsAndConditionsPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Terms and Conditions')
    expect(html).toContain('Sparkle Suite Legal Center')
    expect(html.indexOf('Sparkle Suite Legal Center')).toBeLessThan(
      html.indexOf('Operated and developed by Neon Rabbit Digital Services, Jacksonville, FL.'),
    )
    expect(html).toContain('Plain-English summary')
    expect(html).toContain(
      'Sparkle Suite is software and website support from Neon Rabbit Digital Services.',
    )
    expect(html).toContain(
      'Operated and developed by Neon Rabbit Digital Services, Jacksonville, FL.',
    )
    expect(html).toContain('Last Updated:')
    expect(html).toContain('June 22, 2026')
    expect(html).toContain('Developer:')
    expect(html).toContain('Neon Rabbit Digital Services, Jacksonville, FL')
    expect(html).toContain('Program name: Sparkle Suite / Neon Rabbit Digital Services.')
    expect(html).toContain('Message frequency may vary.')
    expect(html).toContain('Message and data rates may apply.')
    expect(html).toContain('Consent to receive SMS messages is not a condition of purchase.')
    expect(html).toContain('You can opt out at any time by replying STOP.')
    expect(html).toContain('You can request help at any time by replying HELP.')
    expect(html).toContain('Wireless carriers are not liable for delayed or undelivered messages.')
    expect(html).toContain('Listed Sparkle Suite prices do not include taxes.')
    expect(html).toContain(
      'Stripe checkout may calculate and show applicable taxes, payment-processing details, or other checkout-related amounts before payment is submitted.',
    )
    expect(html).toContain(
      'The final amount shown in Stripe checkout controls before payment is submitted.',
    )
    expect(html).toContain('Nic-Nac And AI-Assisted Features')
    expect(html).toContain('Nic-Nac tool access is permission-based and product-surface gated.')
    expect(html).toContain('href="/privacy-policy"')
    expect(html).toContain('href="/prelaunch"')
  })

  it('returns checkout readers to the Nic-Nac account billing section', async () => {
    const page = await TermsAndConditionsPage({
      searchParams: Promise.resolve({
        returnTo:
          '/nic-nac?section=account&onboarding=self-serve-started',
      }),
    })
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Back to checkout')
    expect(html).not.toContain('>Back</a>')
    expect(
      html.match(/href="\/nic-nac\?section=account&amp;onboarding=self-serve-started"/g),
    ).toHaveLength(2)
    expect(html).toContain(
      'href="/nic-nac?section=account&amp;onboarding=self-serve-started"',
    )
    expect(html).toContain(
      'href="/privacy-policy?returnTo=%2Fnic-nac%3Fsection%3Daccount%26onboarding%3Dself-serve-started"',
    )
  })

  it('renders mobile-friendly legal return and footer tap targets', async () => {
    const page = await TermsAndConditionsPage({})
    const html = renderToStaticMarkup(page)

    expect(html.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(html).toContain('aria-label="Back to Sparkle Suite"')
    expect(html).toContain('aria-label="Privacy Policy"')
    expect(html).toContain('aria-label="Terms and Conditions"')
  })

  it('keeps privacy policy framed as Sparkle Suite legal while preserving operator truth', async () => {
    const page = await PrivacyPolicyPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Sparkle Suite Legal Center')
    expect(html).toContain('Privacy Policy')
    expect(html).toContain('Plain-English summary')
    expect(html).toContain(
      'Sparkle Suite uses the information needed to run representative websites, Live Lineup display, forms, messages, and support.',
    )
    expect(html).toContain('Nic-Nac, Memory, And AI-Assisted Features')
    expect(html).toContain(
      'Operated and developed by Neon Rabbit Digital Services, Jacksonville, FL.',
    )
  })

  it('returns privacy readers to checkout with the same polished label', async () => {
    const page = await PrivacyPolicyPage({
      searchParams: Promise.resolve({
        returnTo:
          '/nic-nac?section=account&onboarding=self-serve-started',
      }),
    })
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Back to checkout')
    expect(
      html.match(/href="\/nic-nac\?section=account&amp;onboarding=self-serve-started"/g),
    ).toHaveLength(2)
    expect(html).toContain(
      'href="/terms-and-conditions?returnTo=%2Fnic-nac%3Fsection%3Daccount%26onboarding%3Dself-serve-started"',
    )
  })

  it('exports SEO metadata for the terms route', () => {
    expect(metadata.title).toBe(
      'Sparkle Suite Terms and Conditions | Neon Rabbit Digital Services',
    )
    expect(metadata.description).toBe(
      'Terms and Conditions for Sparkle Suite, the Live Lineup Chrome Extension, Sparkle Suite websites, and Sparkle Suite SMS and email updates.',
    )
  })
})
