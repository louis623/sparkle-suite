import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { renderCardQrFlyerParts, renderCardQrPng } from '@/lib/workspace/card-qr/render'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { assertFlyerQrDecodes } from '@/lib/workspace/card-qr/flyer-decode'
import { renderBizcardFront, renderBizcardBack, buildBizcardPrintPdf, BIZCARD_SAFE_BOX } from '@/lib/workspace/card-qr/bizcard-render'
const palette=resolveCardQrPalette({templateId:'match-site',appearancePreset:'sunset_beach'})
const url='https://example.com/sunset-beach'
describe('approved Sunset Beach exports',()=>{
  it('retains approved sources, motion and deterministically rebuilt plates',()=>{
    const m=JSON.parse(readFileSync('scripts/card-qr/plate-sources/sunset-beach/sources.json','utf8'))
    for(const f of m.files)expect(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.path).toBe(f.sha256)
  })
  it('decodes the small standalone gradient QR with its palm mark',async()=>{
    await expect(assertFlyerQrDecodes(await renderCardQrPng(url,palette,256,'palm'),url)).resolves.toBeUndefined()
  })
  for(const title of ['Sparkle by Sasha','Sunshine & Sparkle Jewelry Boutique'])it('renders approved real flyer and centered cards: '+title,async()=>{
    const flyer=await renderCardQrFlyerParts({palette,appearancePreset:'sunset_beach',destinationUrl:url,showQr:true,showTitle:title,tagline:'A little sparkle. A little sunshine.',firstName:'Sasha',website:'example.com',qrIcon:'palm'})
    expect(flyer.paint).toMatchObject({panelGradient:['#642039','#7b3046','#80421f'],title:'#fff4ed',pillGradient:['#ff7192','#ff9678','#ffc32c'],titleOutline:false})
    expect(await sharp(flyer.flyer).metadata()).toMatchObject({width:1080,height:1920})
    expect(flyer.layout.qr.x+flyer.layout.qr.width/2).toBe(540)
    for(const b of [flyer.flyer,await sharp(flyer.flyer).jpeg({quality:92}).toBuffer()])await assertFlyerQrDecodes(b,url,flyer.layout.qr)
    const front=await renderBizcardFront({key:'sunset-beach',showTitle:title,firstName:'Sasha'})
    for(const b of front.boxes){expect(b.x).toBeGreaterThanOrEqual(BIZCARD_SAFE_BOX.x0);expect(b.x2).toBeLessThanOrEqual(BIZCARD_SAFE_BOX.x1);expect(b.y).toBeGreaterThanOrEqual(BIZCARD_SAFE_BOX.y0);expect(b.y2).toBeLessThanOrEqual(BIZCARD_SAFE_BOX.y1)}
    const middle=(Math.min(...front.boxes.map(b=>b.y))+Math.max(...front.boxes.map(b=>b.y2)))/2
    expect(Math.abs(middle-337.5)).toBeLessThan(8)
    const back=await renderBizcardBack({key:'sunset-beach',qrUrl:url,qrIcon:'palm',name:'Sasha Morgan',email:'sasha@example.com',website:'example.com',textLinkNumber:'2025550147',social:'@sample.sasha',socialPlatform:'instagram',fields:{name:true,email:true,website:true,textLink:true,social:true,discount:false}})
    expect(back.overflow).toBe(false)
    const tile=back.layout.tile,q={x:tile.x,y:tile.y,width:tile.size,height:tile.size}
    for(const b of [back.png,await sharp(back.png).jpeg({quality:92}).toBuffer()])await assertFlyerQrDecodes(b,url,q)
    const pdf=(await buildBizcardPrintPdf({front:front.png,back:back.png})).toString('latin1')
    expect(pdf).toContain('/Count 2');expect(pdf.match(/\/ColorSpace \/DeviceCMYK/g)).toHaveLength(2);expect(pdf).toContain('/TrimBox');expect(pdf).toContain('/BleedBox')
  },30000)
})
