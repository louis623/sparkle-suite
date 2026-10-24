import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe,it,expect} from 'vitest'
import sharp from 'sharp'
import {flyerThemeRecord} from '@/lib/workspace/card-qr/flyer-themes'
import {renderCardQrFlyerParts} from '@/lib/workspace/card-qr/render'
import {resolveCardQrPalette} from '@/lib/workspace/card-qr/palette'
import {assertFlyerQrDecodes} from '@/lib/workspace/card-qr/flyer-decode'
const themes=[
 {theme:'gobble_and_fizz',folder:'gobble-and-fizz',hero:'hero-poster.webp',hash:'a78c049be1137a38b40e0a4e131be568d602b2e7d03690abd6f31b322f2f9372'},
 {theme:'pie_please',folder:'pie-please',hero:'hero-poster-v4.webp',hash:'dd0fe24624eca6e540e8e33949cbb85e7a224ce5cfcaaba711b59196aa49e27c'},
] as const
for(const t of themes)describe(t.folder+' approved oversized-subject flyer',()=>{
 const hero=`public/amethyst/skins/${t.folder}/${t.hero}`
 const plate=`public/amethyst/skins/${t.folder}/flyer/plate.webp`
 it('keeps the approved hero and uses the dedicated portrait plate',async()=>{
  expect(flyerThemeRecord(t.theme)).toMatchObject({source:hero,plate})
  expect(createHash('sha256').update(readFileSync(hero)).digest('hex')).toBe(t.hash)
  expect(await sharp(plate).metadata()).toMatchObject({width:1080,height:1920,format:'webp'})
 })
 it('preserves every pixel of the owner-approved scene after piece composition',async()=>{
  const expected=await sharp(`scripts/card-qr/plate-sources/${t.folder}/scene.webp`).removeAlpha().raw().toBuffer()
  const actual=await sharp(plate).removeAlpha().raw().toBuffer()
  expect(actual.equals(expected)).toBe(true)
 })
 for(const title of ['Autumn Sparkle','A Very Long Autumn Jewelry Shop Name'])it(`keeps actual panels and a decodable centered PNG/JPEG QR for ${title}`,async()=>{
  const url=`https://example.com/${t.folder}-review`
  const p=await renderCardQrFlyerParts({palette:resolveCardQrPalette({templateId:'match-site',appearancePreset:t.theme}),appearancePreset:t.theme,showTitle:title,tagline:'A little sparkle for your season',firstName:'Sample Rep',website:'example.com',destinationUrl:url,showQr:true})
  expect(p.layout.qr.x+p.layout.qr.width/2).toBe(540)
  expect(p.layout.qr.width).toBeGreaterThanOrEqual(560)
  expect(p.layout.panel?.width).toBe(912)
  expect(p.layout.lowerPanel.width).toBe(912)
  expect(p.layout.contentBottom).toBeLessThanOrEqual(1535)
  await expect(assertFlyerQrDecodes(p.flyer,url,p.layout.qr)).resolves.toBeUndefined()
  await expect(assertFlyerQrDecodes(await sharp(p.flyer).jpeg({quality:92}).toBuffer(),url,p.layout.qr)).resolves.toBeUndefined()
 })
})
