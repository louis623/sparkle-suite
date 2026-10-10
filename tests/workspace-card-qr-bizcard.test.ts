import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CARD_QR_DESIGN,
  cleanTextLinkNumber,
  parseCardQrDesign,
} from '@/lib/workspace/card-qr/design'
import { decodeFlyerQr } from '@/lib/workspace/card-qr/flyer-decode'
import { BIZCARD_FONT_FILES } from '@/lib/workspace/card-qr/bizcard-font-map'
import {
  BIZCARD_H,
  BIZCARD_SAFE_BOX,
  BIZCARD_W,
  buildBizcardPrintPdf,
  renderBizcardBack,
  renderBizcardFront,
} from '@/lib/workspace/card-qr/bizcard-render'
import {
  BIZCARD_SHARED_THEMES,
  BIZCARD_THEMES,
  resolveBizcard,
  type BizcardKey,
} from '@/lib/workspace/card-qr/bizcard-themes'
import { bizcardName, bizcardSocialHandle, bizcardWebsite } from '@/lib/workspace/card-qr/bizcard-copy'
import { CARD_QR_SHARED_FLYER_THEMES, flyerTextLinkLine } from '@/lib/workspace/card-qr/flyer-copy'

const URL = 'https://sparkle-suite-smoke.vercel.app/q/1aWLyw'
const KEYS = Object.keys(BIZCARD_THEMES) as BizcardKey[]
const ALL = { name: true, email: true, website: true, textLink: true, social: true, discount: true }
const REP = {
  name: 'Louis Chapman',
  email: 'louis@dudesfizzfest.com',
  website: 'dudesfizzfest.com',
  textLinkNumber: '(555) 201-4410',
  social: '@dudesfizzfest',
}

function inside(box: { x: number; y: number; x2: number; y2: number }) {
  return box.x >= BIZCARD_SAFE_BOX.x0 - 1 && box.x2 <= BIZCARD_SAFE_BOX.x1 + 1 && box.y >= BIZCARD_SAFE_BOX.y0 - 1 && box.y2 <= BIZCARD_SAFE_BOX.y1 + 1
}

describe('business card themes', () => {
  it('covers every shared flyer theme plus the four approved custom reps', () => {
    for (const theme of CARD_QR_SHARED_FLYER_THEMES) expect(BIZCARD_SHARED_THEMES[theme]).toBeTruthy()
    expect(KEYS).toHaveLength(18)
    for (const key of KEYS) {
      expect(existsSync(path.join(process.cwd(), 'lib/workspace/card-qr/card-plates', `${key}.jpg`))).toBe(true)
      for (const file of Object.values(BIZCARD_FONT_FILES[key])) {
        expect(existsSync(path.join(process.cwd(), 'lib/workspace/card-qr/fonts/card', file))).toBe(true)
      }
    }
  })

  it('routes custom reps by site, whatever skin they run, and holds Heather', () => {
    expect(resolveBizcard({ appearancePreset: 'halloween_pumpkin_witch', publicSiteSlug: 'milehighfizz' })).toMatchObject({ status: 'ready', key: 'custom-lindsey' })
    expect(resolveBizcard({ appearancePreset: 'halloween_pumpkin_cat', customDomain: 'www.brittwithbling.com' })).toMatchObject({ status: 'ready', key: 'custom-brittany' })
    expect(resolveBizcard({ appearancePreset: 'gnome_garden', publicSiteSlug: 'goforthebling' })).toMatchObject({ key: 'custom-kim', fullName: 'Kim Goforth' })
    expect(resolveBizcard({ appearancePreset: 'neon_butterfly' })).toMatchObject({ key: 'custom-kelly' })
    expect(resolveBizcard({ appearancePreset: 'amethyst', publicSiteSlug: 'blingkitchen' })).toEqual({ status: 'being_built' })
    expect(resolveBizcard({ appearancePreset: 'black_diamond', publicSiteSlug: 'someone' })).toEqual({ status: 'being_built' })
    expect(resolveBizcard({ appearancePreset: 'sparkle_suite_morganite' })).toMatchObject({ key: 'morganite' })
    expect(resolveBizcard({ appearancePreset: 'rose_quartz' })).toEqual({ status: 'unknown_theme' })
  })
})

describe('text-to-link number', () => {
  it('is typed by the rep, cleaned, and never invented', () => {
    expect(DEFAULT_CARD_QR_DESIGN.textLinkNumber).toBe('')
    expect(cleanTextLinkNumber('555.201.4410')).toBe('(555) 201-4410')
    expect(cleanTextLinkNumber('1 (555) 201 4410')).toBe('(555) 201-4410')
    expect(cleanTextLinkNumber('+44 20 7946 0958')).toBe('+44 20 7946 0958')
    expect(cleanTextLinkNumber('call me <b>')).toBe('')
    expect(cleanTextLinkNumber(42)).toBe('')
    expect(parseCardQrDesign({ textLinkNumber: '5552014410' }).textLinkNumber).toBe('(555) 201-4410')
    expect(parseCardQrDesign({}).fields).toMatchObject({ website: true, textLink: true, discount: false })
    // Never filled from the account phone.
    for (const file of ['app/api/workspace/card-qr/card/route.ts', 'app/api/workspace/card-qr/flyer/route.ts']) {
      expect(readFileSync(path.join(process.cwd(), file), 'utf8')).not.toMatch(/\.phone\b/)
    }
    expect(flyerTextLinkLine('')).toBe('')
    expect(flyerTextLinkLine('(555) 201-4410')).toBe('Text (555) 201-4410 for the shop link')
  })
})

describe('card copy', () => {
  it('uses the approved full name only to extend a first-name-only account', () => {
    expect(bizcardName('Kim', 'Kim Goforth')).toBe('Kim Goforth')
    expect(bizcardName('Kimberly Smith', 'Kim Goforth')).toBe('Kimberly Smith')
    expect(bizcardName('Louis Chapman')).toBe('Louis Chapman')
    expect(bizcardSocialHandle({ facebook: 'https://facebook.com/groups/123', instagram: 'https://instagram.com/dudesfizzfest/' })).toBe('@dudesfizzfest')
    expect(bizcardSocialHandle({ tiktok: '@fizz.queen' })).toBe('@fizz.queen')
    expect(bizcardWebsite('www.DudesFizzfest.com')).toBe('dudesfizzfest.com')
    expect(bizcardWebsite(null)).toBe('')
    expect(bizcardWebsite('')).toBe('')
  })
})

describe('card render', () => {
  it.each(KEYS)('%s front keeps the title in the safe area', async (key) => {
    for (const showTitle of ["Dude's Fizzfest", 'Sparkle & Shine with the Fizz Queens']) {
      const front = await renderBizcardFront({ key, showTitle, firstName: 'Louis' })
      const meta = await sharp(front.png).metadata()
      expect([meta.width, meta.height]).toEqual([BIZCARD_W, BIZCARD_H])
      for (const box of front.boxes) expect(inside(box), `${key} ${showTitle} ${JSON.stringify(box)}`).toBe(true)
    }
  }, 60_000)

  it.each(KEYS)('%s back scans with every detail on, with and without a center mark', async (key) => {
    for (const qrIcon of ['none', 'heart'] as const) {
      const back = await renderBizcardBack({ key, qrUrl: URL, qrIcon, fields: ALL, ...REP })
      expect(back.info.total).toBeLessThanOrEqual(back.info.avail)
      const t = back.layout.tile
      expect(await decodeFlyerQr(back.png, { x: t.x, y: t.y, width: t.size, height: t.size })).toBe(URL)
      // Shrunk to phone-photo size it still reads.
      const small = await sharp(back.png).resize(560).jpeg({ quality: 70 }).toBuffer()
      expect(await decodeFlyerQr(small)).toBe(URL)
    }
  }, 60_000)

  it('hides the website row without a custom domain even when the toggle is on', async () => {
    const none = await renderBizcardBack({ key: 'amethyst', qrUrl: URL, qrIcon: 'none', fields: ALL, ...REP, website: '' })
    const off = await renderBizcardBack({ key: 'amethyst', qrUrl: URL, qrIcon: 'none', fields: { ...ALL, website: false }, ...REP })
    expect(none.png.equals(off.png)).toBe(true)
  }, 30_000)

  it('drops the text line when no number was entered', async () => {
    const withNumber = await renderBizcardBack({ key: 'amethyst', qrUrl: URL, qrIcon: 'none', fields: ALL, ...REP })
    const without = await renderBizcardBack({ key: 'amethyst', qrUrl: URL, qrIcon: 'none', fields: ALL, ...REP, textLinkNumber: '' })
    expect(withNumber.png.equals(without.png)).toBe(false)
    const off = await renderBizcardBack({ key: 'amethyst', qrUrl: URL, qrIcon: 'none', fields: { ...ALL, textLink: false }, ...REP })
    expect(off.png.equals(without.png)).toBe(true)
  }, 30_000)

  it('builds a two-page CMYK print PDF with trim and bleed boxes', async () => {
    const front = await renderBizcardFront({ key: 'gilded-autumn', showTitle: "Dude's Fizzfest", firstName: 'Louis' })
    const back = await renderBizcardBack({ key: 'gilded-autumn', qrUrl: URL, qrIcon: 'none', fields: ALL, ...REP })
    const pdf = await buildBizcardPrintPdf({ front: front.png, back: back.png, label: 'test' })
    const text = pdf.toString('latin1')
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Count 2')
    expect(text.match(/\/DeviceCMYK/g)).toHaveLength(2)
    expect(text).toContain('/TrimBox [27.000 27.000 279.000 171.000]')
    expect(text).toContain('/BleedBox [18.000 18.000 288.000 180.000]')
    expect(text).toContain('/MediaBox [0 0 306.000 198.000]')
  }, 30_000)
})

describe('flyer text-to-link line', () => {
  it('adds the line under the website and the flyer still scans', async () => {
    const { renderCardQrFlyerParts } = await import('@/lib/workspace/card-qr/render')
    const { renderCheckedFlyerFiles } = await import('@/lib/workspace/card-qr/flyer-encode')
    const { resolveCardQrPalette } = await import('@/lib/workspace/card-qr/palette')
    const base = {
      palette: resolveCardQrPalette({ templateId: 'match-site', appearancePreset: 'amethyst' }),
      destinationUrl: URL,
      showQr: true,
      appearancePreset: 'amethyst' as const,
      showTitle: "Dude's Fizzfest",
      tagline: '',
      firstName: 'Louis',
      website: 'DUDESFIZZFEST.COM',
    }
    const plain = await renderCardQrFlyerParts(base)
    expect(plain.layout.textLink).toBeNull()
    const parts = await renderCardQrFlyerParts({ ...base, textLink: flyerTextLinkLine('(555) 201-4410') })
    expect(parts.layout.textLink?.lines.join(' ')).toBe('Text (555) 201-4410 for the shop link')
    expect(parts.layout.textLink!.top).toBeGreaterThan(parts.layout.website!.top)
    await expect(renderCheckedFlyerFiles(parts.flyer, URL, parts.layout.qr)).resolves.toBeTruthy()
  }, 60_000)
})
