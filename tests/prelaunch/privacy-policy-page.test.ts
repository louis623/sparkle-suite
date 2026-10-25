import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import PrivacyPolicyPage, { metadata } from '@/app/privacy-policy/page'

describe('Sparkle Suite privacy policy page', () => {
  it('renders the public privacy policy with required SMS compliance language', async () => {
    const page = await PrivacyPolicyPage({})
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Privacy Policy')
    expect(html).toContain('Last Updated:')
    expect(html).toContain('October 25, 2026')
    expect(html).toContain('Neon Rabbit Digital Services')
    expect(html).toContain('Sparkle Suite Live Lineup Chrome Extension')
    expect(html).toContain('stable order and party identifiers')
    expect(html).toContain('assigned Live Lineup code')
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

  it('pins the four favorites-sharing sentences in the rendered policy', async () => {
    const page = await PrivacyPolicyPage({})
    const html = renderToStaticMarkup(page)
    const howWeUse = html.indexOf('How We Use Your Data')
    const favorites = html.indexOf('Your Favorites And Sharing Between Representatives')
    const nicNac = html.indexOf('Nic-Nac, Memory, And AI-Assisted Features')

    expect(howWeUse).toBeGreaterThan(-1)
    expect(favorites).toBeGreaterThan(howWeUse)
    expect(nicNac).toBeGreaterThan(favorites)
    expect(html).toContain('The representative you sign up with can see your favorites.')
    expect(html).toContain(
      'Another Sparkle Suite representative can see your favorites only if you buy from that representative&#x27;s Bomb Party shop and that representative has opted in to sharing favorites.',
    )
    expect(html).toContain(
      'Only the representative you sign up with can email or text you. Sharing your favorites never lets another representative contact you through Sparkle Suite or Sparkle Finder, and our tools don&#x27;t let them export or download your favorites.',
    )
    expect(html).toContain('We do not sell personal information.')
    expect(html).not.toContain('to help keep representative data isolated')
  })

  it('exports SEO metadata for the privacy policy route', () => {
    expect(metadata.title).toBe(
      'Sparkle Suite Privacy Policy | Neon Rabbit Digital Services',
    )
    expect(metadata.description).toBe(
      'Privacy Policy for Sparkle Suite, the Live Lineup Chrome Extension, Sparkle Suite websites, and Sparkle Suite SMS and email updates.',
    )
  })
})
