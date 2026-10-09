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
  encodeCardQrFlyerJpeg,
  flyerBytesSha256,
  renderCheckedFlyerFiles,
} from '@/lib/workspace/card-qr/flyer-encode'
import {
  CARD_QR_FLYER_JPG_QUALITY,
  DEFAULT_CARD_QR_FLYER_FORMAT,
  flyerDownloadBytes,
  flyerPreviewCacheKey,
  parseCardQrFlyerFormat,
} from '@/lib/workspace/card-qr/flyer-format'
import {
  FLYER_FONT_FACES,
  FLYER_FONT_ROOT,
  FLYER_FONT_SUBSTITUTES,
  FLYER_THEME_FONTS,
  flyerFontFile,
} from '@/lib/workspace/card-qr/flyer-fonts'
import { retainCoveredGlyphs } from '@/lib/workspace/card-qr/glyphs'
import {
  CARD_QR_FLYER_BEING_BUILT_MESSAGE,
  CARD_QR_SHARED_FLYER_THEMES,
  buildCardQrFlyerCopy,
} from '@/lib/workspace/card-qr/flyer-copy'
import {
  FLYER_CONTENT_BOTTOM,
  FLYER_MARGIN_LEFT,
  FLYER_MARGIN_RIGHT,
  FLYER_SAFE_BOTTOM,
  FLYER_SAFE_TOP,
  FLYER_TEXT_MAX_WIDTH,
} from '@/lib/workspace/card-qr/flyer-layout'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import {
  CARD_QR_DARK,
  CARD_QR_ERROR_CORRECTION,
  CARD_QR_FLYER_HEIGHT,
  CARD_QR_FLYER_WIDTH,
  CARD_QR_LIGHT,
  CARD_QR_MARGIN,
  flyerTextRenderOptions,
  renderCardQrFlyerParts,
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

function dudeCopy(overrides?: { tagline?: string; website?: string | null; showTitle?: string }) {
  return {
    showTitle: overrides?.showTitle ?? "Dude's Fizzfest",
    tagline: overrides?.tagline ?? 'Come for the fizz. Stay for the sparkle.',
    firstName: 'Louis',
    website: overrides?.website === undefined ? null : overrides.website,
  }
}

async function expectInkInsideSafeZones(flyer: Buffer, background: Buffer) {
  const full = await sharp(flyer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const back = await sharp(background).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const width = full.info.width
  const height = full.info.height
  const channels = full.info.channels
  const offenders: string[] = []
  const differs = (x: number, y: number) => {
    const index = (y * width + x) * channels
    return (
      Math.abs((full.data[index] ?? 0) - (back.data[index] ?? 0)) > 12 ||
      Math.abs((full.data[index + 1] ?? 0) - (back.data[index + 1] ?? 0)) > 12 ||
      Math.abs((full.data[index + 2] ?? 0) - (back.data[index + 2] ?? 0)) > 12
    )
  }
  const note = (where: string, x: number, y: number) => {
    if (offenders.length < 6) offenders.push(`${where} ${x},${y}`)
  }
  for (let y = 0; y < FLYER_SAFE_TOP; y += 2) {
    for (let x = 0; x < width; x += 4) {
      if (differs(x, y)) note('top', x, y)
    }
  }
  const bottomStart = height - FLYER_SAFE_BOTTOM
  for (let y = bottomStart; y < height; y += 2) {
    for (let x = 0; x < width; x += 4) {
      if (differs(x, y)) note('bottom', x, y)
    }
  }
  for (let y = FLYER_SAFE_TOP; y < bottomStart; y += 4) {
    for (let x = 0; x < FLYER_MARGIN_LEFT; x += 3) {
      if (differs(x, y)) note('left', x, y)
    }
    for (let x = FLYER_MARGIN_RIGHT; x < width; x += 3) {
      if (differs(x, y)) note('right', x, y)
    }
  }
  expect(offenders).toEqual([])
}

describe('flyer render', () => {
  it.each(CARD_QR_SHARED_FLYER_THEMES)(
    'renders %s inside the safe zones and the QR decodes',
    async (theme) => {
      const copy = dudeCopy()
      const parts = await renderCardQrFlyerParts({
        palette: resolveCardQrPalette({
          templateId: 'match-site',
          appearancePreset: theme,
        }),
        ...copy,
        appearancePreset: theme,
        destinationUrl: URL,
        showQr: true,
      })
      const meta = await sharp(parts.flyer).metadata()
      expect(meta.width).toBe(CARD_QR_FLYER_WIDTH)
      expect(meta.height).toBe(CARD_QR_FLYER_HEIGHT)
      expect(meta.format).toBe('png')
      await expect(assertFlyerQrDecodes(parts.flyer, URL)).resolves.toBeUndefined()
      expect(parts.layout.contentTop).toBeGreaterThanOrEqual(FLYER_SAFE_TOP)
      expect(parts.layout.contentBottom).toBeLessThanOrEqual(FLYER_CONTENT_BOTTOM)
      expect(parts.layout.showTitle?.lines.join(' ')).toBe(copy.showTitle)
      expect(parts.layout.tagline?.lines.join(' ')).toBe(copy.tagline)
      expect(parts.layout.website).toBeNull()
      expect(parts.layout.signOff?.lines.join(' ')).toBe('Shop with Louis anytime')
      const words = [
        ...(parts.layout.showTitle?.lines ?? []),
        ...(parts.layout.tagline?.lines ?? []),
        ...(parts.layout.instructions.lines ?? []),
        ...(parts.layout.signOff?.lines ?? []),
      ].join(' ')
      expect(words).not.toContain('Sparkle Suite')
      expect(words).not.toContain('@')
      expect(words.toLowerCase()).not.toContain('louis@')
      await expectInkInsideSafeZones(parts.flyer, parts.background)

      const { data, info } = await sharp(parts.flyer).raw().toBuffer({ resolveWithObject: true })
      const inside = pixel(data, info, parts.layout.qr.x + 8, parts.layout.qr.y + 8)
      const frame = pixel(data, info, parts.layout.qr.x - 4, parts.layout.qr.y + 24)
      expect(inside).toEqual([255, 255, 255])
      expect(frame).not.toEqual([255, 255, 255])
    },
  )

  it('shrinks a long show title instead of cutting it off', async () => {
    const showTitle = "Dude's Extraordinary Midnight Sparkle Fizzfest Society"
    expect(showTitle.length).toBeGreaterThan(40)
    const parts = await renderCardQrFlyerParts({
      palette: resolveCardQrPalette({
        templateId: 'match-site',
        appearancePreset: 'sparkle_suite_morganite',
      }),
      ...dudeCopy({ showTitle, tagline: 'A very long tagline that still has to wrap inside the side margins of the portrait flyer.' }),
      appearancePreset: 'sparkle_suite_morganite',
      destinationUrl: URL,
      showQr: true,
    })
    const drawn = parts.layout.showTitle?.lines.join(' ') ?? ''
    expect(drawn).toBe(showTitle)
    expect(parts.layout.showTitle?.lines.length).toBeGreaterThan(1)
    expect(parts.layout.showTitle?.size).toBeLessThanOrEqual(104)
    expect(parts.layout.contentBottom).toBeLessThanOrEqual(FLYER_CONTENT_BOTTOM)
    expect(FLYER_TEXT_MAX_WIDTH).toBeLessThan(FLYER_MARGIN_RIGHT - FLYER_MARGIN_LEFT)
    await expectInkInsideSafeZones(parts.flyer, parts.background)
    await expect(assertFlyerQrDecodes(parts.flyer, URL)).resolves.toBeUndefined()
  })

  it('closes the tagline and website slots when they are absent, and prints a custom domain', async () => {
    const open = await renderCardQrFlyerParts({
      palette: resolveCardQrPalette({
        templateId: 'match-site',
        appearancePreset: 'moonstone',
      }),
      ...dudeCopy({ tagline: '' }),
      appearancePreset: 'moonstone',
      destinationUrl: URL,
      showQr: true,
    })
    const withDomain = await renderCardQrFlyerParts({
      palette: resolveCardQrPalette({
        templateId: 'match-site',
        appearancePreset: 'moonstone',
      }),
      ...dudeCopy({ website: 'DUDESFIZZFEST.COM' }),
      appearancePreset: 'moonstone',
      destinationUrl: 'https://dudesfizzfest.com',
      showQr: true,
    })
    expect(open.layout.tagline).toBeNull()
    expect(open.layout.website).toBeNull()
    expect(withDomain.layout.website?.lines.join(' ')).toBe('DUDESFIZZFEST.COM')
    expect(withDomain.layout.pill.y).toBeGreaterThan(open.layout.pill.y)
    await expect(assertFlyerQrDecodes(withDomain.flyer, 'https://dudesfizzfest.com')).resolves.toBeUndefined()
    await expectInkInsideSafeZones(open.flyer, open.background)
    await expectInkInsideSafeZones(withDomain.flyer, withDomain.background)
  })

  it('builds flyer copy from the show title and tagline, not email or the ticker', () => {
    const copy = buildCardQrFlyerCopy({
      businessName: "Dude's Fizzfest",
      displayName: 'Louis Rivera',
      tagline: 'Come for the fizz.',
      customDomain: 'www.dudesfizzfest.com',
    })
    expect(copy).toEqual({
      showTitle: "Dude's Fizzfest",
      tagline: 'Come for the fizz.',
      firstName: 'Louis',
      website: 'DUDESFIZZFEST.COM',
    })
    expect(
      buildCardQrFlyerCopy({
        businessName: "Dude's Fizzfest",
        displayName: 'Louis',
        tagline: '',
        customDomain: 'sparkle-suite-smoke.vercel.app',
      }).website,
    ).toBeNull()
    expect(CARD_QR_SHARED_FLYER_THEMES).toHaveLength(14)
    expect(CARD_QR_SHARED_FLYER_THEMES).not.toContain('neon_butterfly')
    expect(CARD_QR_SHARED_FLYER_THEMES).not.toContain('rose_quartz')
  })
})

describe('flyer file formats', () => {
  it('encodes JPG from one PNG and both files decode to the same URL', async () => {
    const png = await renderCardQrFlyerPng({
      palette: resolveCardQrPalette({
        templateId: 'match-site',
        appearancePreset: 'sparkle_suite_morganite',
      }),
      showTitle: "Dude's Fizzfest",
      tagline: 'Come for the fizz. Stay for the sparkle.',
      firstName: 'Louis',
      appearancePreset: 'sparkle_suite_morganite',
      destinationUrl: URL,
      showQr: true,
    })
    const files = await renderCheckedFlyerFiles(png, URL)
    expect(files.png.equals(png)).toBe(true)
    const again = await encodeCardQrFlyerJpeg(png)
    expect(again.equals(files.jpg)).toBe(true)
    expect(flyerBytesSha256(files.jpg)).toBe(flyerBytesSha256(again))
    expect(CARD_QR_FLYER_JPG_QUALITY).toBe(94)
    const meta = await sharp(files.jpg).metadata()
    expect(meta.format).toBe('jpeg')
    await expect(assertFlyerQrDecodes(files.jpg, URL)).resolves.toBeUndefined()
  })

  it('uses one cache key so the download is the preview bytes', () => {
    expect(DEFAULT_CARD_QR_FLYER_FORMAT).toBe('jpg')
    expect(parseCardQrFlyerFormat(undefined)).toBe('jpg')
    expect(parseCardQrFlyerFormat('png')).toBe('png')
    expect(parseCardQrFlyerFormat('jpeg')).toBe('jpg')
    expect(parseCardQrFlyerFormat('gif')).toBeNull()
    const key = flyerPreviewCacheKey('png', URL)
    expect(flyerPreviewCacheKey('png', URL)).toBe(key)
    expect(flyerPreviewCacheKey('jpg', URL)).not.toBe(key)
    const bytes = new Uint8Array([1, 2, 3])
    const cached = { key, bytes }
    expect(flyerDownloadBytes(cached, key)).toBe(bytes)
    expect(flyerDownloadBytes(cached, flyerPreviewCacheKey('jpg', URL))).toBeNull()
  })
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
    expect(response.headers.get('Content-Type')).toContain('image/jpeg')
    const jpg = Buffer.from(await response.arrayBuffer())
    expect(response.headers.get('X-Card-Qr-Flyer-Sha256')).toBe(flyerBytesSha256(jpg))
    const { data, info } = await sharp(jpg).raw().toBuffer({ resolveWithObject: true })
    const background = pixel(data, info, 8, 80)
    expect(background[0]).toBeLessThan(50)
    await expect(assertFlyerQrDecodes(jpg, URL)).resolves.toBeUndefined()
  })

  it.each(['neon_butterfly', 'gnome_garden', 'alpine_opal', 'black_diamond'] as const)(
    'returns the being-built state for %s and no flyer file',
    async (theme) => {
      mocks.loadCardQrContext.mockResolvedValue(context(theme))
      const response = await postFlyer(
        new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/flyer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'png' }),
        }),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/json')
      await expect(response.json()).resolves.toEqual({
        code: 'CARD_QR_FLYER_BEING_BUILT',
        status: 'being_built',
        message: CARD_QR_FLYER_BEING_BUILT_MESSAGE,
      })
    },
  )

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

  it('returns a JPG from the same PNG pixels when format is jpg', async () => {
    mocks.loadCardQrContext.mockResolvedValue(context('sparkle_suite_morganite'))
    const response = await postFlyer(
      new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/flyer?format=jpg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'jpeg' }),
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('image/jpeg')
    const jpg = Buffer.from(await response.arrayBuffer())
    expect(response.headers.get('X-Card-Qr-Flyer-Sha256')).toBe(flyerBytesSha256(jpg))
    const meta = await sharp(jpg).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(CARD_QR_FLYER_WIDTH)
    expect(meta.height).toBe(CARD_QR_FLYER_HEIGHT)
    await expect(assertFlyerQrDecodes(jpg, URL)).resolves.toBeUndefined()
  })

  it('rejects an unknown format', async () => {
    mocks.loadCardQrContext.mockResolvedValue(context('sparkle_suite_morganite'))
    const response = await postFlyer(
      new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'gif' }),
      }),
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'CARD_QR_FLYER_FORMAT_INVALID',
    })
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
