import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import PrivacyPolicyPage, { metadata } from '@/app/privacy-policy/page'

describe('Sparkle Suite privacy policy page', () => {
  it('renders the public privacy policy with required SMS compliance language', async () => {
    const page = await PrivacyPolicyPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Privacy Policy')
    expect(html).toContain('Last Updated:')
    expect(html).toContain('September 13, 2026')
    expect(html).toContain('Neon Rabbit Digital Services')
    expect(html).toContain('Sparkle Suite Live Queue Chrome Extension')
    expect(html).toContain('stable order and party identifiers')
    expect(html).toContain('assigned Live Queue code')
    expect(html).toContain('stored on our server only as non-reversible hashes')
    expect(html).not.toContain('<li>order IDs</li>')
    expect(html).toContain('does not expose order IDs, party IDs, pairing credentials')
    expect(html).toContain('Nic-Nac, Memory, And AI-Assisted Features')
    expect(html).toContain('Nic-Nac memory is a product feature.')
    expect(html).toContain(
      'bounded safe representative memory may be shared between Sparkle Suite and Sparkle Finder',
    )
    expect(html).toContain('Message frequency may vary.')
    expect(html).toContain('Message and data rates may apply.')
    expect(html).toContain('Consent is not a condition of purchase.')
    expect(html).toContain('replying STOP')
    expect(html).toContain('replying HELP')
    expect(html).toContain('href="/prelaunch"')
    expect(html).toContain('href="/terms-and-conditions"')
    expect(html).toContain('Website Analytics')
    expect(html).toContain('use Google Analytics to understand visits')
    expect(html).toContain('We don&#x27;t send names, emails, or phone numbers to Google Analytics.')
    expect(html).toContain('Google may collect standard information like approximate location and device type.')
    expect(html).not.toContain('No personal information is sent to Google Analytics.')
    expect(html).toContain('href="https://tools.google.com/dlpage/gaoptout"')
  })

  it('exports SEO metadata for the privacy policy route', () => {
    expect(metadata.title).toBe(
      'Sparkle Suite Privacy Policy | Neon Rabbit Digital Services',
    )
    expect(metadata.description).toBe(
      'Privacy Policy for Sparkle Suite, the Live Queue Chrome Extension, Sparkle Suite websites, and Sparkle Suite SMS and email updates.',
    )
  })
})
