import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  assertApprovedFallOwlHeroPoster,
  FALL_OWL_HERO_POSTER_RELATIVE_PATH,
  FALL_OWL_HERO_POSTER_SHA256,
  FALL_OWL_SHARE_SCENE,
  renderFallOwlShareScenePng,
} from '@/lib/amethyst/fall-owl-share-art'

const root = process.cwd()
const hero = resolve(root, FALL_OWL_HERO_POSTER_RELATIVE_PATH)
const monogramSvg = resolve(root, 'scripts/customer-site-assets/blingwithkrissig-monogram.svg')
const monogramPng = resolve(root, 'public/customer-site-assets/blingwithkrissig-monogram-b.png')

describe('Fall Owl share scene', () => {
  it('refuses any hero poster other than the approved file', () => {
    expect(createHash('sha256').update(readFileSync(hero)).digest('hex')).toBe(
      FALL_OWL_HERO_POSTER_SHA256,
    )
    expect(() => assertApprovedFallOwlHeroPoster(readFileSync(hero))).not.toThrow()
    expect(() => assertApprovedFallOwlHeroPoster(Buffer.from('redrawn-owl'))).toThrow(
      /approved artwork/,
    )
  })

  it('cover-crops the approved poster without replacing its pixels', async () => {
    const scene = await renderFallOwlShareScenePng()
    const actual = await sharp(scene).raw().toBuffer({ resolveWithObject: true })
    const expected = await sharp(readFileSync(hero))
      .resize(FALL_OWL_SHARE_SCENE.width, FALL_OWL_SHARE_SCENE.height, {
        fit: 'cover',
        position: 'centre',
      })
      .raw()
      .toBuffer({ resolveWithObject: true })

    expect(actual.info).toMatchObject({
      width: FALL_OWL_SHARE_SCENE.width,
      height: FALL_OWL_SHARE_SCENE.height,
      channels: expected.info.channels,
    })
    expect(Buffer.compare(actual.data, expected.data)).toBe(0)
  })
})

describe('BlingwithKrissiG monogram', () => {
  it('ships the path-drawn mark as a PNG raster of the vector source', async () => {
    const svg = readFileSync(monogramSvg, 'utf8')
    expect(svg).not.toMatch(/<text[\s>]/)
    expect(svg).not.toMatch(/<image[\s>]/)
    expect(svg).not.toContain('<rect')
    expect(svg).toContain('#140b14')
    expect(svg).toContain('#efba73')

    const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } }).render().asPng()
    const actual = await sharp(monogramPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const expected = await sharp(rendered).ensureAlpha().raw().toBuffer()
    expect(actual.data.equals(expected)).toBe(true)
    expect(actual.info).toMatchObject({
      width: 1024,
      height: 1024,
      channels: 4,
    })

    const { data, info } = actual
    const pixel = (x: number, y: number) => {
      const index = (y * info.width + x) * info.channels
      return [data[index], data[index + 1], data[index + 2], data[index + 3]]
    }
    for (const [x, y] of [[0, 0], [1023, 0], [0, 1023], [1023, 1023], [6, 512]] as const) {
      expect(pixel(x, y)[3]).toBe(0)
    }
    const interior = pixel(512, 140)
    expect(interior[3]).toBe(255)
    expect(interior[0]).toBeGreaterThan(interior[1])
    expect(interior[0]).toBeLessThan(90)

    let minX = info.width
    let maxX = 0
    let minY = info.height
    let maxY = 0
    let stemLeft = info.width
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const [red, green, blue, alpha] = pixel(x, y)
        if (alpha < 200 || Math.hypot(x - 512, y - 512) >= 410) continue
        if (red <= 160 || green <= 90 || red <= blue + 40) continue
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        if (y > 470 && y < 550) stemLeft = Math.min(stemLeft, x)
      }
    }
    const overhang = stemLeft - minX
    expect(overhang).toBeGreaterThan(8)
    expect(overhang).toBeLessThanOrEqual(24)
    expect(Math.abs((minX + maxX) / 2 - 512)).toBeLessThanOrEqual(4)
    expect(Math.abs((minY + maxY) / 2 - 512)).toBeLessThanOrEqual(4)
  })
})
