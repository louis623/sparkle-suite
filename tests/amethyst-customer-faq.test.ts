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
    expect(copy).toContain('MSRP shown for a dancer is for reference only')
    expect(copy).toContain('it is optional')
    expect(copy).toContain('crop out personal and order information')
    expect(copy).toContain('Your rep sees the request')
  })

  it('renders one accessible FAQ page with the rep skin and slug links', async () => {
    const response = await renderCustomerFaq(
      new Request('https://www.yoursparklesuite.com/bri/faq'),
      { repId: 'rep-1', publicSiteSlug: 'bri' },
    )
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('class="homepage faq-page bg-black-velvet surface-dark-metallic')
    expect(html).toContain('--hp-primary:#d4af37')
    expect(html).toContain('<h2 id="dance-floor-title">Dance Floor FAQ</h2>')
    expect(html).toContain('<h1 id="faq-title">FAQ</h1>')
    expect(html).toContain('<details class="faq-item" open>')
    expect(html).toContain('href="/bri/trade"')
    expect(html).toContain('href="/bri/faq"')
    expect(html).toContain('href="https://www.yoursparklesuite.com/bri/faq"')
    expect(html).toContain('Bri &amp; Co')
    expect(html).toContain('Skip to questions')
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
