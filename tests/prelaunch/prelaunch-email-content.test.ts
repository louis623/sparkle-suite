import { describe, expect, it } from 'vitest'

import {
  buildInitialPrelaunchNewsletterIssue,
  buildPrelaunchPaymentCheckoutEmailContent,
  buildSelfServePurchaseConfirmationEmailContent,
  buildPrelaunchWaitlistWelcomeEmailContent,
} from '@/lib/prelaunch/email-content'

describe('prelaunch email content', () => {
  it('builds a short welcome email with unsubscribe language', () => {
    const email = buildPrelaunchWaitlistWelcomeEmailContent('Jamie Hart')

    expect(email.subject).toBe("You're in the Sparkle Suite build queue")
    expect(email.text).toContain('Hi Jamie Hart,')
    expect(email.text).toContain(
      'better customer experience with less patchwork behind the scenes',
    )
    expect(email.text).toContain('Reply to this email any time')
    expect(email.text).toContain('unsubscribe')
    expect(email.text).toContain('Your details are saved.')
    expect(email.text).toContain('Joining the build queue does not reserve a founder rate.')
    expect(email.text).not.toContain('Stripe test-mode')
    expect(email.text).not.toContain('waitlist')
  })

  it('describes founder checkout without a founder-spot count', () => {
    const email = buildPrelaunchPaymentCheckoutEmailContent({
      name: 'Jamie Hart',
      checkoutUrl: 'https://checkout.example/founder',
      pricingTier: 'founder',
    })

    expect(email.text).toContain('This checkout uses the founding-rep pricing path.')
    expect(email.text).not.toMatch(/\bfirst-20\b|\bfirst 20\b|\b20 spots\b|founder spots remaining|spots left/)
  })

  it('builds a text-first prelaunch newsletter issue draft', () => {
    const issue = buildInitialPrelaunchNewsletterIssue()

    expect(issue.subject).toBe('A smoother rep setup starts with less patchwork')
    expect(issue.text).toContain(
      'A better customer experience starts with a better rep setup.',
    )
    expect(issue.text).toContain('Live event calendar')
    expect(issue.text).toContain('Email updates')
    expect(issue.text).toContain('join the waitlist')
  })

  it('builds the self-serve purchase confirmation handoff to Nic-Nac and help', () => {
    const email = buildSelfServePurchaseConfirmationEmailContent({
      name: 'Jamie Hart',
      backendUrl: 'https://www.yoursparklesuite.com/nic-nac',
      publicSiteUrl: 'https://jamie.yoursparklesuite.com',
      helpUrl: 'https://www.yoursparklesuite.com/nic-nac?section=help-resources',
    })

    expect(email.subject).toBe('Your Sparkle Suite workspace is ready')
    expect(email.text).toContain('Hi Jamie Hart,')
    expect(email.text).toContain('Nic-Nac')
    expect(email.text).toContain('https://www.yoursparklesuite.com/nic-nac')
    expect(email.text).toContain('https://jamie.yoursparklesuite.com')
    expect(email.text).toContain('help/how-to hub')
    expect(email.text).toContain('calculator')
    expect(email.text).toContain('Chrome extension')
    expect(email.text).toContain('Live Lineup')
    expect(email.text).toContain('Louis only needs to step in if something gets escalated')
    expect(email.text).not.toContain('consult')
    expect(email.text).not.toContain('SignWell')
  })
})
