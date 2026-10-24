import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { flyerThemeRecord } from '@/lib/workspace/card-qr/flyer-themes'
import { renderCardQrFlyerParts } from '@/lib/workspace/card-qr/render'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { assertFlyerQrDecodes } from '@/lib/workspace/card-qr/flyer-decode'

const hero = 'public/amethyst/skins/fall-owl/hero-poster.webp'
const plate = 'public/amethyst/skins/fall-owl/flyer/plate.webp'
const pieces = 'scripts/card-qr/plate-sources/fall-owl/'
const url = 'https://example.com/fall-owl-review'
const details = [
  { name: 'face', left: 765, top: 125, width: 170, height: 80 },
  { name: 'amber pendant', left: 827, top: 296, width: 28, height: 34 },
  { name: 'amber wing gems', left: 963, top: 286, width: 45, height: 92 },
]

describe('Fall Owl approved high-perch plate', () => {
  it('uses the dedicated portrait plate and preserves the approved hero', async () => {
    const record = flyerThemeRecord('fall_owl_harvest_moon')
    expect(record.source).toBe(hero)
    expect(record.plate).toBe(plate)
    expect(createHash('sha256').update(readFileSync(hero)).digest('hex')).toBe('8ccb49ca53ccc0e5da7e6e50fdc02ef6d20735f70f09cc994f156d2180af9693')
    expect(await sharp(plate).metadata()).toMatchObject({ width: 1080, height: 1920, format: 'webp' })
    expect(await sharp(pieces + 'floor.png').metadata()).toMatchObject({width:1080,height:437})
  })

  for (const { name, ...box } of details) {
    it(`keeps the original ${name} pixels and retains them in the plate`, async () => {
      const original = await sharp(hero).extract(box).removeAlpha().raw().toBuffer()
      const cutout = await sharp(pieces+'owl.png').extract({...box,left:box.left-700,top:box.top-35}).removeAlpha().raw().toBuffer()
      expect(cutout.equals(original)).toBe(true)
      const mapped = {
        left: 825 + Math.round((box.left-700)*169/385),
        top: 12 + Math.round((box.top-35)*233/530),
        width: Math.round(box.width*169/385),
        height: Math.round(box.height*233/530),
      }
      const expected = await sharp(original,{raw:{width:box.width,height:box.height,channels:3}}).resize(mapped.width,mapped.height).raw().toBuffer()
      const actual = await sharp(plate).extract(mapped).removeAlpha().raw().toBuffer()
      const mae = expected.reduce((total,value,i)=>total+Math.abs(value-actual[i]),0)/expected.length
      expect(mae).toBeLessThan(18)
    })
  }

  for (const showTitle of ['Autumn Sparkle', 'Bling with Krissi', 'A Very Long Autumn Jewelry Shop Name']) {
    it(`keeps the owl visible and decodes the centered QR for ${showTitle}`, async () => {
      const parts = await renderCardQrFlyerParts({
        palette:resolveCardQrPalette({templateId:'match-site',appearancePreset:'fall_owl_harvest_moon'}),
        appearancePreset:'fall_owl_harvest_moon',showTitle,
        tagline:'A little sparkle for your season',firstName:'Sample Rep',
        website:'example.com',destinationUrl:url,showQr:true,
      })
      expect(parts.layout.qr.x + parts.layout.qr.width/2).toBe(540)
      // The full source cutout (head, body, pendant and feet) ends at y=245.
      expect(parts.layout.panel?.y).toBeGreaterThan(245)
      expect(parts.layout.qr.y).toBeGreaterThan(245)
      await expect(assertFlyerQrDecodes(parts.flyer,url,parts.layout.qr)).resolves.toBeUndefined()
      const jpg = await sharp(parts.flyer).jpeg({quality:92}).toBuffer()
      await expect(assertFlyerQrDecodes(jpg,url,parts.layout.qr)).resolves.toBeUndefined()
    })
  }
})
