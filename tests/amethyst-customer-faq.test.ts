import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadTemplateData = vi.hoisted(() => vi.fn())
vi.mock('@/lib/amethyst/preview-template-data', () => ({
  loadAmethystPreviewTemplateData: loadTemplateData,
}))

import { DANCE_FLOOR_FAQ, renderCustomerFaq } from '@/lib/amethyst/customer-faq'

describe('customer Dance Floor FAQ', () => {
  beforeEach(() => {
    loadTemplateData.mockReset()
    loadTemplateData.mockResolvedValue({
      appearancePreset: 'black_diamond',
      homepage: {
        businessName: 'Bri & Co',
        footerLinks: {
          home: '/amethyst/Homepage.html?c=rep-1',
          joinTeam: '/amethyst/Join.html?c=rep-1',
        },
      },
    })
  })

  it('uses Dance Floor language and the confirmed rules', () => {
    const copy = DANCE_FLOOR_FAQ.map(({ question, answer }) => `${question} ${answer}`).join(' ')
    expect(copy).not.toMatch(/\b(dancer swap|trade|trading|swap|swapping)\b/i)
    expect(copy).toContain('same collection family')
    expect(copy).toContain('same jewelry type')
    expect(copy).toContain('cross months and years')
    expect(copy).toContain('OG dancers pair with OG dancers')
    expect(copy).not.toMatch(/MSRP|price comparison/i)
    expect(copy).toContain('it is optional')
    expect(copy).toContain('crop out personal and order information')
    expect(copy).toContain('Your rep sees the request')
  })

  it('renders Suite landing theme chrome with layout v2 and slug links', async () => {
    const response = await renderCustomerFaq(
      new Request('https://www.yoursparklesuite.com/bri/faq'),
      { repId: 'rep-1', publicSiteSlug: 'bri' },
    )
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('class="faq-page"')
    expect(html).toContain('faq.css?v=20260930-customer-faq-landing-theme')
    expect(html).toContain('#ee2c9b')
    expect(html).toContain('#fcf8f6')
    expect(html).toContain('#1b1218')
    expect(html).toContain('Playfair+Display')
    expect(html).toContain('DM+Sans')
    expect(html).toContain("Playfair Display")
    expect(html).toContain('class="faq-seal"')
    expect(html).toContain('>Sparkle Suite</span>')
    expect(html).toContain('data-band="night"')
    expect(html).toContain('data-band="paper"')
    expect(html).toContain('data-band="blush"')
    expect(html).toContain('id="dance-floor"')
    expect(html).toContain('id="live-lineup"')
    expect(html).toContain('id="join-team"')
    expect(html).toContain('id="privacy"')
    expect(html).toContain('class="faq-group-label">Dance Floor</p>')
    expect(html).toContain('class="faq-group-label">Live Lineup</p>')
    expect(html).toContain('class="faq-group-label">Join Team</p>')
    expect(html).toContain('class="faq-group-label">Accounts</p>')
    expect(html).toContain('class="faq-jump"')
    expect(html).toContain('href="#dance-floor"')
    expect(html).toContain('href="#live-lineup"')
    expect(html).toContain('href="#join-team"')
    expect(html).toContain('href="#privacy"')
    expect(html).toContain('This page is about this Sparkle Suite site')
    expect(html).toContain('https://help.bombparty.com/hc/en-us')
    expect(html).toContain('Want your own Sparkle Suite?')
    expect(html).toContain('https://www.yoursparklesuite.com/prelaunch')
    expect(html).not.toContain('Draft — needs Louis')
    expect(html).not.toContain('faq-draft-banner')
    expect(html).not.toContain('faq-draft-pill')
    expect(html).not.toContain('faq-draft-note')
    expect(html).toContain('Can I send a request after the show ends?')
    expect(html).toContain('No. Dance Floor requests are only during the live show')
    expect(html).toContain('After the show ends, Sparkle Suite does not take new Dance Floor requests.')
    expect(html).not.toContain('Product intent is live-show')
    expect(html).not.toContain('Live Queue')
    expect(html).not.toContain('live queue')
    expect(html).not.toContain('Live queue')
    expect(html).toContain('Live Lineup')
    expect(html).toContain('What is the Live lineup?')
    expect(html).toContain('How fast will my request be answered?')
    expect(html).toContain('Usually during the live show while both pieces are in play')
    expect(html).toContain('timing is up to your rep')
    expect(html).toContain('Do I need an account to watch the Live Lineup or browse the Dance Floor?')
    expect(html).toContain('You do not need an account to view the Live Lineup')
    expect(html).toContain('browse the Dance Floor, or send a Dance Floor request')
    expect(html).not.toContain('Confirm with Louis before treating this as final')
    expect(html).toContain('What is the Join Team page?')
    expect(html).toContain('learn about that rep&#39;s team, meet members, and find the official next step')
    expect(html).not.toContain('they choose to show')
    expect(html).toContain('Do I need experience?')
    expect(html).toContain('No experience needed')
    expect(html).toContain('beauty of being on a team')
    expect(html).not.toContain('Review the current official requirements and ask the team lead what training')
    expect(html).not.toContain('What support will I get?')
    expect(html).not.toContain('Support differs by team and can change')
    expect(html).toContain('<h1 id="faq-title">FAQ</h1>')
    expect(html).toContain('<details class="faq-item" open>')
    expect(html).toContain('href="/bri/trade"')
    expect(html).toContain('href="/bri/faq"')
    expect(html).toContain('href="https://www.yoursparklesuite.com/bri/faq"')
    expect(html).toContain('Bri &amp; Co')
    expect(html).toContain('href="https://www.yoursparklesuite.com/"')
    expect(html).toContain('This site&#39;s powered by Sparkle Suite')
    expect(html).toContain(
      'Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.',
    )
    expect(html).not.toContain('independent tool for reps')
    expect(html).toContain('target="_blank"')
    expect(html).not.toContain('Powered by Sparkle Suite')
    expect(html).toContain('Skip to questions')
    expect(html).toContain('tiktok.com/@yoursparklesuite.com')
    expect(html).toContain('youtube.com/@SparkleSuite')
    expect(html).toContain('TikTok')
    expect(html).toContain('YouTube')
    expect(html).not.toContain('homepage faq-page')
    expect(html).not.toContain('--hp-primary')
    expect(html).not.toContain('faq-dark')
    expect(html).not.toContain('amethyst/homepage.css')
  })

  it('keeps custom-domain links on the customer domain', async () => {
    const response = await renderCustomerFaq(
      new Request('https://brisglowtique.com/customer-site/faq?c=brisglowtique.com'),
      { repId: 'rep-1', customDomain: true },
    )
    const html = await response.text()
    expect(html).toContain('href="/trade"')
    expect(html).toContain('href="/faq"')
    expect(html).toContain('href="https://brisglowtique.com/faq"')
    expect(html).not.toContain('href="/bri/faq"')
  })

  it('keeps Suite landing theme even when the rep skin is dark Halloween', async () => {
    loadTemplateData.mockResolvedValueOnce({
      appearancePreset: 'halloween_pumpkin_witch',
      homepage: {
        businessName: 'Britt with Bling',
        footerLinks: { home: '/', joinTeam: '/join' },
      },
    })
    const response = await renderCustomerFaq(
      new Request('https://brittwithbling.com/faq'),
      { repId: 'rep-1', customDomain: true },
    )
    const html = await response.text()
    expect(html).toContain('class="faq-page"')
    expect(html).toContain('data-band="night"')
    expect(html).toContain('class="faq-seal"')
    expect(html).toContain('#ee2c9b')
    expect(html).not.toContain('bg-halloween-pumpkin-witch')
    expect(html).not.toContain('faq-dark')
  })

  it('does not show a generic rep identity if targeted content cannot load', async () => {
    loadTemplateData.mockResolvedValueOnce({
      appearancePreset: 'sparkle_suite_morganite',
      homepage: { businessName: 'Generic', footerLinks: { home: '/amethyst/Homepage.html' } },
    })
    const response = await renderCustomerFaq(
      new Request('https://www.yoursparklesuite.com/faq?c=rep-1'),
      { repId: 'rep-1' },
    )
    expect(response.status).toBe(503)
  })
})
