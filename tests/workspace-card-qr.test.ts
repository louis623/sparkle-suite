import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { CardQrTool } from '@/app/nic-nac/components/CardQrTool'
import {
  BusinessToolsCard,
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
  resolveCardQrRequestOrigin,
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

  it('reads the public Smoke marker in a form Next can inline', () => {
    const source = readFileSync(
      resolve('lib/workspace/card-qr/access.ts'),
      'utf8',
    )
    const start = source.indexOf('export function isCardQrToolEnabled')
    const body = source.slice(start, source.indexOf('export function', start + 1))
    expect(body).toContain(
      "return process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'",
    )
    expect(body).not.toMatch(/function isCardQrToolEnabled\s*\([^)]+\)/)
    expect(body).not.toMatch(/[^.]env\.NEXT_PUBLIC_SPARKLE_ENVIRONMENT/)
    expect(source).toContain('isSuiteSmokeEnvironment(env)')
  })

  it('replaces the Business Cards placeholder with a ready Cards & QR entry on Smoke', () => {
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'smoke')
    const html = renderToStaticMarkup(
      createElement(BusinessToolsCard, { onOpenCardQr: () => undefined }),
    )
    expect(html).toContain('QR codes, QR flyers, business cards')
    expect(html).toContain('Build your site QR. Download a free QR code flyer, or order printed cards that match your site.')
    expect(html).toContain('Open tool')
    expect(html).toContain('businessToolReadyAction')
    expect(html).toContain('Ready')
    expect(html).toContain('Business Calculator')
    expect(html.match(/Coming Soon/g) ?? []).toHaveLength(1)
    expect(html).not.toContain('Business Cards')
  })

  it('resolves the QR origin from the request host without Stripe secrets', () => {
    const contextSource = readFileSync(
      resolve('lib/workspace/card-qr/context.ts'),
      'utf8',
    )
    expect(contextSource).not.toContain('getAppUrl')
    expect(contextSource).not.toContain('getStripeConfig')
    expect(contextSource).not.toContain('resolveCheckoutReturnOrigin')
    expect(
      resolveCardQrRequestOrigin(
        new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/qr'),
        {} as NodeJS.ProcessEnv,
      ),
    ).toBe('https://sparkle-suite-smoke.vercel.app')
    expect(
      resolveCardQrRequestOrigin(
        new Request('http://169.254.1.1/api/workspace/card-qr/qr'),
        { NEXT_PUBLIC_APP_URL: 'https://sparkle-suite-smoke.vercel.app' } as NodeJS.ProcessEnv,
      ),
    ).toBe('https://sparkle-suite-smoke.vercel.app')
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
    expect(morganite.qrDark).toBe('#5b1e3b')
    expect(morganite.qrLight).toBe('#FFFFFF')
    expect(diamond.qrDark).toBe('#1a1408')
    expect(diamond.qrLight).toBe('#FFFFFF')
    expect(
      resolveCardQrPalette({
        templateId: 'halloween',
        appearancePreset: 'sparkle_suite_morganite',
      }).name,
    ).toBe('Sparkle Suite/Morganite')
    expect(
      resolveCardQrPalette({
        templateId: 'classic-ivory',
        appearancePreset: 'halloween_pumpkin_cat',
      }).background,
    ).toBe(
      resolveCardQrPalette({
        templateId: 'match-site',
        appearancePreset: 'halloween_pumpkin_cat',
      }).background,
    )
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
      showTitle: "Dude's Fizzfest",
      tagline: 'Come for the fizz. Stay for the sparkle.',
      firstName: 'Louis',
      website: null,
      appearancePreset: 'sparkle_suite_morganite',
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
    expect(html).toContain('>QR code<')
    expect(html).not.toContain('QR code builder')
    expect(html).toContain('Your customer site already has an address. This QR is a short link to it, colored for your site. The flyer and cards use the same code.')
    expect(html).toContain('>None<')
    expect(html).toContain('>Diamond<')
    expect(html).toContain('>Unicorn<')
    expect(html).toMatch(/aria-pressed="true"[^>]*>None</)
    expect(html).toContain('qrLayout')
    expect(html).toContain('https://sparkle-suite-smoke.vercel.app/fizzfest')
    expect(html).toContain('Download QR')
    expect(html).toContain('Copy QR')
    const toolSource = readFileSync(
      resolve('app/nic-nac/components/CardQrTool.tsx'),
      'utf8',
    )
    expect(toolSource).toContain('new ClipboardItem')
    expect(toolSource).toContain("credentials: 'same-origin'")
    expect(toolSource).toContain('URL.createObjectURL')
    expect(html).not.toContain('Save to profile')
    expect(html).not.toContain('Copy site address')
    expect(html).not.toContain('Match my site')
    expect(html).not.toContain('Classic ivory')
    expect(html).not.toContain('>Halloween<')
    expect(html).toContain('>PNG<')
    expect(html).toContain('>JPG<')
    expect(html).toMatch(/aria-pressed="true"[^>]*>JPG</)
    expect(html).toMatch(/aria-pressed="false"[^>]*>PNG</)
    expect(html).toContain('Making your flyer…')
    expect(html).toContain('Download JPG')
    expect(toolSource).toContain('CARD_QR_FLYER_BEING_BUILT_MESSAGE')
    expect(html).toContain('The preview is the file you download.')
    expect(html).not.toContain('Download portrait PNG')
    expect(toolSource).toContain('flyerDownloadBytes')
    expect(toolSource).toContain('flyerPreviewCacheKey')
    expect(toolSource).not.toContain('design, appearancePreset')
    expect(toolSource).not.toContain('quantity, design, appearancePreset')
    expect(html).toContain('Dude&#x27;s Fizzfest')
    expect(html).toContain('louis@neonrabbit.net')
    expect(html).not.toContain('TikTok @fizzfest')
    expect(html).not.toContain('Save to profile')
    expect(html).not.toContain('Copy site address')
    expect(html).not.toContain('Site address copied')
    expect(html).not.toContain('aria-label="Fields"')
    expect(html).not.toContain('Discount code')
    expect(html).not.toContain('>Name<')
    expect(html).not.toContain('>Email<')
    expect(html).not.toContain('>Social<')
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
