import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { CardQrTool } from '@/app/nic-nac/components/CardQrTool'
import {
  getInitialWorkspaceSection,
  resolveWorkspaceSectionForAccess,
} from '@/app/nic-nac/components/DashboardPlaceholder'
import { GET as getCardQr } from '@/app/api/workspace/card-qr/route'
import {
  buildCardQrCheckoutParams,
  readPaidCardQrOrder,
  assertCardQrStripeTestKey,
} from '@/lib/workspace/card-qr/checkout'
import { DEFAULT_CARD_QR_DESIGN } from '@/lib/workspace/card-qr/design'
import {
  buildCardQrDestinationForRep,
  isReadyCardQrDestination,
} from '@/lib/workspace/card-qr/destination'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import {
  CARD_QR_PACKS,
  CARD_QR_TURNAROUND_COPY,
} from '@/lib/workspace/card-qr/pricing'
import {
  CARD_QR_FLYER_HEIGHT,
  CARD_QR_FLYER_WIDTH,
  buildCardQrPressStubLines,
  buildCardQrPressStubPdf,
  renderCardQrFlyerPng,
  renderCardQrPng,
} from '@/lib/workspace/card-qr/render'
import { ServiceError } from '@/lib/services/errors'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Cards & QR smoke locks', () => {
  it('keeps the tool off the live Tools list', () => {
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'production')
    expect(getInitialWorkspaceSection('?section=card-qr')).toBe('more')
    expect(resolveWorkspaceSectionForAccess('card-qr', true)).toBe('more')
  })

  it('opens the tool on Smoke', () => {
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    expect(getInitialWorkspaceSection('?section=card-qr')).toBe('card-qr')
    expect(resolveWorkspaceSectionForAccess('card-qr', true)).toBe('card-qr')
  })

  it('returns 404 outside Smoke', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'production')
    const response = await getCardQr(new Request('https://www.yoursparklesuite.com/api/workspace/card-qr'))
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ code: 'CARD_QR_SMOKE_ONLY' })
  })

  it('locks the all-in card prices and turnaround', () => {
    expect(CARD_QR_PACKS[500]).toMatchObject({ amountCents: 10_000, priceLabel: '$100' })
    expect(CARD_QR_PACKS[1000]).toMatchObject({ amountCents: 12_000, priceLabel: '$120' })
    expect(CARD_QR_TURNAROUND_COPY).toContain('2 weeks')
    expect(CARD_QR_TURNAROUND_COPY).toContain('14 business days')
  })

  it('builds a payment checkout for the selected pack and refuses live Stripe', () => {
    const params = buildCardQrCheckoutParams({
      repId: 'rep-1',
      email: 'louis@neonrabbit.net',
      quantity: 1000,
      destinationUrl: 'https://sparkle-suite-smoke.vercel.app/fizzfest',
      origin: 'https://sparkle-suite-smoke.vercel.app',
      design: DEFAULT_CARD_QR_DESIGN,
    })
    expect(params.mode).toBe('payment')
    expect(params.line_items[0]?.price_data.unit_amount).toBe(12_000)
    expect(params.success_url).toContain('section=card-qr')
    expect(() => assertCardQrStripeTestKey('sk_live_secret')).toThrow(ServiceError)
    expect(() => assertCardQrStripeTestKey(undefined)).toThrow(ServiceError)
    expect(() => assertCardQrStripeTestKey('sk_test_smoke')).not.toThrow()
  })

  it('accepts only a paid test-mode session at the locked amount', () => {
    const order = readPaidCardQrOrder(
      {
        id: 'cs_test_123',
        mode: 'payment',
        livemode: false,
        payment_status: 'paid',
        amount_total: 10_000,
        currency: 'usd',
        client_reference_id: 'rep-1',
        payment_intent: 'pi_test_123',
        metadata: {
          sparkle_product: 'workspace_business_cards',
          environment: 'smoke',
          rep_id: 'rep-1',
          quantity: '500',
          amount_cents: '10000',
          destination_url: 'https://sparkle-suite-smoke.vercel.app/fizzfest',
          template_id: 'match-site',
        },
      },
      'rep-1',
    )
    expect(order.quantity).toBe(500)
    expect(() =>
      readPaidCardQrOrder(
        {
          id: 'cs_live',
          mode: 'payment',
          livemode: true,
          payment_status: 'paid',
          amount_total: 10_000,
          currency: 'usd',
          client_reference_id: 'rep-1',
          metadata: {
            sparkle_product: 'workspace_business_cards',
            environment: 'smoke',
            rep_id: 'rep-1',
            quantity: '500',
          },
        },
        'rep-1',
      ),
    ).toThrow(ServiceError)
  })

  it('uses the current site address and follows a theme change', () => {
    const destination = buildCardQrDestinationForRep(
      { publicSiteSlug: 'fizzfest', repId: 'rep-1' },
      'https://sparkle-suite-smoke.vercel.app',
    )
    expect(destination).toBe('https://sparkle-suite-smoke.vercel.app/fizzfest')
    expect(
      buildCardQrDestinationForRep(
        { customDomain: 'dudesfizzfest.com', publicSiteSlug: 'fizzfest', repId: 'rep-1' },
        'https://sparkle-suite-smoke.vercel.app',
      ),
    ).toBe('https://dudesfizzfest.com')
    expect(isReadyCardQrDestination('https://www.yoursparklesuite.com/amethyst/Homepage.html')).toBe(false)

    const morganite = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: 'sparkle_suite_morganite',
    })
    const diamond = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: 'black_diamond',
    })
    expect(morganite.background).not.toBe(diamond.background)
    expect(
      resolveCardQrPalette({
        templateId: 'halloween',
        appearancePreset: 'sparkle_suite_morganite',
      }).name,
    ).toBe('Halloween')
  })

  it('renders a portrait flyer and a labeled press stub', async () => {
    const palette = resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: 'sparkle_suite_morganite',
    })
    const qr = await renderCardQrPng('https://sparkle-suite-smoke.vercel.app/fizzfest', palette)
    expect(qr.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    const flyer = await renderCardQrFlyerPng({
      palette,
      lines: ["Dude's Fizzfest", 'Louis'],
      destinationUrl: 'https://sparkle-suite-smoke.vercel.app/fizzfest',
      showQr: true,
    })
    const meta = await sharp(flyer).metadata()
    expect(meta.width).toBe(CARD_QR_FLYER_WIDTH)
    expect(meta.height).toBe(CARD_QR_FLYER_HEIGHT)
    expect(meta.format).toBe('png')

    const pdf = buildCardQrPressStubPdf(
      buildCardQrPressStubLines({
        destinationUrl: 'https://sparkle-suite-smoke.vercel.app/fizzfest',
        templateName: palette.name,
      }),
    ).toString('utf8')
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('not a press-ready CMYK file')
    expect(pdf).toContain('3.5')
    expect(pdf).toContain('14pt C1S')
  })

  it('shows the three Smoke sections and the locked prices', () => {
    const html = renderToStaticMarkup(
      createElement(CardQrTool, {
        siteHref: 'https://sparkle-suite-smoke.vercel.app/fizzfest',
        displayName: 'Louis',
        businessName: "Dude's Fizzfest",
        email: 'louis@neonrabbit.net',
        appearancePreset: 'sparkle_suite_morganite',
        socialHandles: { tiktok: '@fizzfest' },
      }),
    )
    expect(html).toContain('QR code builder')
    expect(html).toContain('QR flyer')
    expect(html).toContain('Business cards')
    expect(html).toContain('https://sparkle-suite-smoke.vercel.app/fizzfest')
    expect(html).toContain('1080×1920')
    expect(html).toContain('No Stripe charge')
    expect(html).toContain('$100')
    expect(html).toContain('$120')
    expect(html).toContain('UPS Ground')
    expect(html).toContain('14 business days')
    expect(html).toContain('Smoke only')
  })
})
