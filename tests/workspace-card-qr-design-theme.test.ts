import jsQR from 'jsqr'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { CARD_QR_ICONS } from '@/lib/workspace/card-qr/design'
import { cardQrDesignThemeOptions, readCardQrDesignTheme } from '@/lib/workspace/card-qr/design-theme'
import { CARD_QR_SHARED_FLYER_THEMES } from '@/lib/workspace/card-qr/flyer-copy'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrPng } from '@/lib/workspace/card-qr/render'
import fs from 'node:fs'
import path from 'node:path'

const URL = 'https://sparkle-suite-smoke.vercel.app/q/2pWSNJ'

async function decode(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
}

describe('Design theme picker', () => {
  it.each([['gobble_and_fizz', 'gobble-and-fizz'], ['pie_please', 'pie-please']] as const)('%s keeps its matching card and thumbnail in the shared picker', (preset, key) => {
    const options = cardQrDesignThemeOptions(preset, key)
    expect(options[0]).toMatchObject({ id: 'site', preset, thumb: `/card-qr-themes/${key}.webp` })
    expect(options.filter(option => option.preset === preset)).toHaveLength(1)
    expect(fs.existsSync(path.join(process.cwd(), 'public', options[0].thumb!))).toBe(true)
    expect(readCardQrDesignTheme(preset)).toBe(preset)
  })
  it('shared-theme rep: their theme first as the site tile, one tile per shared theme, no duplicates', () => {
    const options = cardQrDesignThemeOptions('amethyst', 'amethyst')
    expect(options).toHaveLength(CARD_QR_SHARED_FLYER_THEMES.length)
    expect(options[0]).toMatchObject({ id: 'site', preset: 'amethyst', isSite: true, thumb: '/card-qr-themes/amethyst.webp' })
    expect(options.filter((o) => o.preset === 'amethyst')).toHaveLength(1)
    expect(new Set(options.map((o) => o.preset))).toEqual(new Set(CARD_QR_SHARED_FLYER_THEMES))
  })

  it('custom rep: their custom design first, then all shared themes', () => {
    const options = cardQrDesignThemeOptions('gnome_garden', 'custom-kim')
    expect(options).toHaveLength(CARD_QR_SHARED_FLYER_THEMES.length + 1)
    expect(options[0]).toMatchObject({ id: 'site', label: 'Your custom design', thumb: '/card-qr-themes/custom-kim.webp' })
    expect(options.slice(1).map((o) => o.id)).toEqual([...CARD_QR_SHARED_FLYER_THEMES])
  })

  it('custom rep on a shared preset still sees their own design first and can pick that shared theme', () => {
    const options = cardQrDesignThemeOptions('amethyst', 'custom-lindsey')
    expect(options).toHaveLength(CARD_QR_SHARED_FLYER_THEMES.length + 1)
    expect(options[0].thumb).toBe('/card-qr-themes/custom-lindsey.webp')
    expect(options.some((o) => o.id === 'amethyst')).toBe(true)
  })

  it('every tile has a thumbnail file and color dots', () => {
    for (const o of [...cardQrDesignThemeOptions('amethyst', 'amethyst'), ...cardQrDesignThemeOptions('gnome_garden', 'custom-kim')]) {
      expect(o.thumb, o.id).toBeTruthy()
      expect(fs.existsSync(path.join(process.cwd(), 'public', o.thumb!)), o.thumb!).toBe(true)
      expect(o.dots.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('server accepts site or a shared theme only', () => {
    expect(readCardQrDesignTheme(undefined)).toBeNull()
    expect(readCardQrDesignTheme('site')).toBeNull()
    expect(readCardQrDesignTheme('halloween_pumpkin_cat')).toBe('halloween_pumpkin_cat')
    expect(() => readCardQrDesignTheme('gnome_garden')).toThrow()
    expect(() => readCardQrDesignTheme('rose_quartz')).toThrow()
    expect(() => readCardQrDesignTheme(42)).toThrow()
  })

  it('every shared theme color x every center mark scans (full size and small JPG)', async () => {
    const failures: string[] = []
    for (const theme of CARD_QR_SHARED_FLYER_THEMES) {
      const palette = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: theme })
      for (const icon of CARD_QR_ICONS) {
        const png = await renderCardQrPng(URL, palette, 480, icon)
        if ((await decode(png)) !== URL) failures.push(`${theme}/${icon}/full`)
        const small = await sharp(png).resize(192).jpeg({ quality: 60 }).toBuffer()
        if ((await decode(await sharp(small).png().toBuffer())) !== URL) failures.push(`${theme}/${icon}/small`)
      }
    }
    expect(failures).toEqual([])
  }, 600000)
})
