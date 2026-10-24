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
    expect(svg).toContain('#201321')
    expect(svg).toContain('#efba73')

    const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } }).render().asPng()
    const actual = await sharp(monogramPng).raw().toBuffer()
    const expected = await sharp(rendered).raw().toBuffer()
    expect(actual.equals(expected)).toBe(true)
    expect(await sharp(monogramPng).metadata()).toMatchObject({
      width: 1024,
      height: 1024,
      format: 'png',
    })
  })
})
