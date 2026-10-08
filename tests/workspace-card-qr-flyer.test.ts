import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { POST as postFlyer } from '@/app/api/workspace/card-qr/flyer/route'
import { GET as getQr } from '@/app/api/workspace/card-qr/qr/route'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'
import { parseCardQrDesign } from '@/lib/workspace/card-qr/design'
import {
  FlyerQrDecodeError,
  assertFlyerQrDecodes,
} from '@/lib/workspace/card-qr/flyer-decode'
import {
  FLYER_FONT_FACES,
  FLYER_FONT_ROOT,
  FLYER_FONT_SUBSTITUTES,
  FLYER_THEME_FONTS,
  flyerFontFile,
} from '@/lib/workspace/card-qr/flyer-fonts'
import { retainCoveredGlyphs } from '@/lib/workspace/card-qr/glyphs'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import {
  CARD_QR_DARK,
  CARD_QR_ERROR_CORRECTION,
  CARD_QR_FLYER_HEIGHT,
  CARD_QR_FLYER_WIDTH,
  CARD_QR_LIGHT,
  CARD_QR_MARGIN,
  flyerQrPlacement,
  flyerTextRenderOptions,
  renderCardQrFlyerPng,
  renderCardQrPng,
} from '@/lib/workspace/card-qr/render'

const URL = 'https://sparkle-suite-smoke.vercel.app/fizzfest'

const mocks = vi.hoisted(() => ({
  loadCardQrContext: vi.fn(),
  useRealDecoder: true,
  assertFlyerQrDecodes: vi.fn(),
}))

vi.mock('@/lib/workspace/card-qr/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workspace/card-qr/context')>()
  return {
    ...actual,
    loadCardQrContext: mocks.loadCardQrContext,
  }
})

vi.mock('@/lib/workspace/card-qr/flyer-decode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workspace/card-qr/flyer-decode')>()
  return {
    ...actual,
    assertFlyerQrDecodes: (
      ...args: Parameters<typeof actual.assertFlyerQrDecodes>
    ) =>
      mocks.useRealDecoder
        ? actual.assertFlyerQrDecodes(...args)
        : mocks.assertFlyerQrDecodes(...args),
  }
})

function context(appearancePreset: string) {
  return {
    repId: 'rep-1',
    destinationUrl: URL,
    settings: {
      appearancePreset,
      displayName: 'Louis',
      businessName: "Dude's Fizzfest",
      email: 'louis@neonrabbit.net',
      socialHandles: { tiktok: '@fizzfest' },
    },
  }
}

function pixel(data: Buffer, info: sharp.OutputInfo, x: number, y: number) {
  const index = (y * info.width + x) * info.channels
  return [data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0]
}

beforeEach(() => {
  mocks.useRealDecoder = true
  mocks.loadCardQrContext.mockReset()
  mocks.assertFlyerQrDecodes.mockReset()
})

describe('flyer fonts', () => {
  it('maps every theme id to a heading and body font', () => {
    for (const id of AMETHYST_APPEARANCE_PRESET_IDS) {
      expect(FLYER_THEME_FONTS[id]?.heading, id).toBeTruthy()
      expect(FLYER_THEME_FONTS[id]?.body, id).toBeTruthy()
    }
    expect(Object.keys(FLYER_THEME_FONTS)).toHaveLength(
      AMETHYST_APPEARANCE_PRESET_IDS.length,
    )
    expect(FLYER_THEME_FONTS.halloween_pumpkin_cat).toEqual({
      heading: 'Gelasio',
      body: 'Arimo',
    })
    expect(FLYER_THEME_FONTS.garnet).toEqual({
      heading: 'Cormorant Garamond',
      body: 'Inter',
    })
    expect(FLYER_THEME_FONTS.amber).toEqual({
      heading: 'Playfair Display',
      body: 'Nunito',
    })
    expect(FLYER_THEME_FONTS.velvet).toEqual({
      heading: 'Bitter',
      body: 'Archivo',
    })
    expect(FLYER_THEME_FONTS.rose_quartz).toEqual({
      heading: 'Great Vibes',
      body: 'DM Sans',
    })
    expect(FLYER_THEME_FONTS.emerald_garden).toEqual({
      heading: 'Great Vibes',
      body: 'Lato',
    })
    expect(FLYER_FONT_SUBSTITUTES).toEqual({
      Boska: 'Cormorant Garamond',
      Switzer: 'Inter',
      Melodrama: 'Playfair Display',
      Sharpie: 'Great Vibes',
      Ranade: 'DM Sans',
    })
  })

  it('ships an OFL file beside each bundled family', () => {
    for (const face of Object.values(FLYER_FONT_FACES)) {
      const names = readdirSync(resolve(FLYER_FONT_ROOT, face.directory))
      expect(names, face.directory).toContain('OFL.txt')
      expect(names.some((name) => name.endsWith('.ttf'))).toBe(true)
      expect(readFileSync(resolve(FLYER_FONT_ROOT, face.directory, 'OFL.txt'), 'utf8')).toContain(
        'SIL Open Font License, Version 1.1',
      )
    }
  })

  it('keeps apostrophe, accent, and ampersand, and drops emoji', () => {
    const covered = retainCoveredGlyphs(
      "Dude's café & 😀",
      flyerFontFile('Playfair Display'),
      flyerFontFile('Noto Sans'),
    )
    expect(covered).toContain("'")
    expect(covered).toContain('é')
    expect(covered).toContain('&')
    expect(covered).not.toContain('😀')
  })

  it('draws text with system fonts turned off', () => {
    const options = flyerTextRenderOptions([flyerFontFile('Noto Sans')])
    expect(options.font?.loadSystemFonts).toBe(false)
    expect(options.font?.defaultFontFamily).toBe('Noto Sans')
    const source = readFileSync(resolve('lib/workspace/card-qr/render.ts'), 'utf8')
    expect(source).toContain('flyerTextRenderOptions')
    expect(source).not.toContain('Georgia')
    expect(source).not.toContain('sans-serif')
    expect(source).not.toContain('palette.qrDark')
    expect(source).not.toContain('palette.qrLight')
  })
})

describe('flyer render', () => {
  it.each(['halloween_pumpkin_cat', 'sparkle_suite_morganite'] as const)(
    'renders a 1080×1920 %s flyer whose QR decodes exactly',
    async (theme) => {
      const lines = ["Dude's Fizzfest", 'Louis', 'cafés & more']
      const flyer = await renderCardQrFlyerPng({
        palette: resolveCardQrPalette({
          templateId: 'match-site',
          appearancePreset: theme,
        }),
        lines,
        businessName: "Dude's Fizzfest",
        appearancePreset: theme,
        destinationUrl: URL,
        showQr: true,
      })
      const meta = await sharp(flyer).metadata()
      expect(meta.width).toBe(CARD_QR_FLYER_WIDTH)
      expect(meta.height).toBe(CARD_QR_FLYER_HEIGHT)
      expect(meta.format).toBe('png')
      await expect(assertFlyerQrDecodes(flyer, URL)).resolves.toBeUndefined()

      const { data, info } = await sharp(flyer).raw().toBuffer({ resolveWithObject: true })
      const place = flyerQrPlacement(lines.length, true)
      const inside = pixel(data, info, place.left + 2, place.top + 2)
      const outside = pixel(data, info, place.left - 4, place.top + 20)
      expect(inside).toEqual([255, 255, 255])
      expect(outside).not.toEqual([255, 255, 255])

      let ink = 0
      for (let y = 180; y < 520; y += 3) {
        for (let x = 180; x < 900; x += 3) {
          const [red, green, blue] = pixel(data, info, x, y)
          const background = pixel(data, info, 8, 80)
          if (
            Math.abs(red - background[0]) +
              Math.abs(green - background[1]) +
              Math.abs(blue - background[2]) >
            90
          ) {
            ink += 1
          }
        }
      }
      expect(ink).toBeGreaterThan(40)
    },
  )
})

describe('flyer route', () => {
  it('ignores body.appearancePreset and uses the saved theme', async () => {
    mocks.loadCardQrContext.mockResolvedValue(context('halloween_pumpkin_cat'))
    const response = await postFlyer(
      new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appearancePreset: 'sparkle_suite_morganite',
          design: { templateId: 'classic-ivory' },
        }),
      }),
    )
    expect(response.status).toBe(200)
    const png = Buffer.from(await response.arrayBuffer())
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
    const background = pixel(data, info, 8, 80)
    expect(background[0]).toBeLessThan(40)
    await expect(assertFlyerQrDecodes(png, URL)).resolves.toBeUndefined()
  })

  it('rejects an unknown saved theme', async () => {
    mocks.loadCardQrContext.mockResolvedValue(context('not-a-theme'))
    const response = await postFlyer(
      new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearancePreset: 'sparkle_suite_morganite' }),
      }),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      code: 'CARD_QR_THEME_UNKNOWN',
    })
  })

  it('returns 422 when the QR does not decode', async () => {
    mocks.useRealDecoder = false
    mocks.loadCardQrContext.mockResolvedValue(context('sparkle_suite_morganite'))
    mocks.assertFlyerQrDecodes.mockRejectedValue(
      new FlyerQrDecodeError(URL, 'https://wrong.example'),
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await postFlyer(
      new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      code: 'CARD_QR_FLYER_DECODE_FAILED',
      error: "We couldn't make a flyer that scans right. We've been notified.",
    })
    expect(errorSpy).toHaveBeenCalledWith(
      'CARD_QR_FLYER_DECODE_FAILED',
      expect.objectContaining({
        theme: 'sparkle_suite_morganite',
        repId: 'rep-1',
        expected: URL,
        decoded: 'https://wrong.example',
      }),
    )
    errorSpy.mockRestore()
  })

  it('still accepts a saved halloween template id and ignores it', () => {
    expect(parseCardQrDesign({ templateId: 'halloween' }).templateId).toBe('halloween')
    expect(parseCardQrDesign({ templateId: 'classic-ivory' }).templateId).toBe(
      'classic-ivory',
    )
  })
})

describe('QR image', () => {
  it('returns dark-on-white modules at level H with a wide quiet zone', async () => {
    const spy = vi.spyOn(QRCode, 'toBuffer')
    const png = await renderCardQrPng(URL, {
      qrDark: '#ffffff',
      qrLight: '#111111',
    })
    expect(spy).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        errorCorrectionLevel: CARD_QR_ERROR_CORRECTION,
        margin: CARD_QR_MARGIN,
        color: { dark: CARD_QR_DARK, light: CARD_QR_LIGHT },
      }),
    )
    spy.mockRestore()
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    })
    expect(pixel(data, info, 0, 0)).toEqual([255, 255, 255])
    let dark = false
    for (let index = 0; index < data.length; index += info.channels) {
      if ((data[index] ?? 255) < 40) {
        dark = true
        break
      }
    }
    expect(dark).toBe(true)
    await expect(assertFlyerQrDecodes(png, URL)).resolves.toBeUndefined()

    mocks.loadCardQrContext.mockResolvedValue(context('halloween_pumpkin_cat'))
    const response = await getQr(
      new Request(
        'https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/qr?skin=sparkle_suite_morganite',
      ),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('image/png')
    const routePng = Buffer.from(await response.arrayBuffer())
    const routeImage = await sharp(routePng).raw().toBuffer({ resolveWithObject: true })
    expect(pixel(routeImage.data, routeImage.info, 0, 0)).toEqual([255, 255, 255])
    await expect(assertFlyerQrDecodes(routePng, URL)).resolves.toBeUndefined()
  })
})
