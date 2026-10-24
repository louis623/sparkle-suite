import {describe,it,expect} from 'vitest'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {BIZCARD_SAFE_BOX,renderBizcardFront,renderBizcardBack,buildBizcardPrintPdf} from '@/lib/workspace/card-qr/bizcard-render'
import {decodeFlyerQr} from '@/lib/workspace/card-qr/flyer-decode'
const inside=(b:{x:number;y:number;x2:number;y2:number})=>b.x>=BIZCARD_SAFE_BOX.x0-1&&b.x2<=BIZCARD_SAFE_BOX.x1+1&&b.y>=BIZCARD_SAFE_BOX.y0-1&&b.y2<=BIZCARD_SAFE_BOX.y1+1
for(const key of ['fall-owl','gobble-and-fizz','pie-please'] as const)describe(key+' business card',()=>{
 it('keeps normal and long front copy in the existing safe text area, clear of the right-hand subject',async()=>{
  expect(await sharp(`lib/workspace/card-qr/card-plates/${key}.jpg`).metadata()).toMatchObject({width:1125,height:675})
  for(const showTitle of ['Autumn Sparkle','A Little Sparkle for Every Season']){
   const f=await renderBizcardFront({key,showTitle,firstName:'Alexandria'})
   expect(f.boxes.every(inside)).toBe(true)
   expect(Math.max(...f.boxes.map(b=>b.x2))).toBeLessThan(558)
  }
 })
 it('preserves optional rep fields and decodes the actual back in PNG and JPEG',async()=>{
  const url='https://example.com/card/'+key
  const b=await renderBizcardBack({key,qrUrl:url,qrIcon:'none',name:'Jordan Avery',email:'hello@example.com',website:'example.com',textLinkNumber:'(202) 555-0147',social:'@sampleshop',socialPlatform:'instagram',fields:{name:true,email:true,website:true,textLink:true,social:true,discount:true}})
  expect(b.overflow).toBe(false)
  expect(b.warnings).toEqual([])
  expect(b.layout.fields.every(inside)).toBe(true)
  expect(b.layout.fields.map(f=>f.id)).toEqual(expect.arrayContaining(['name','role','email','website','text','social','discount']))
  const q={x:b.layout.tile.x,y:b.layout.tile.y,width:b.layout.tile.size,height:b.layout.tile.size}
  expect(await decodeFlyerQr(b.png,q)).toBe(url)
  expect(await decodeFlyerQr(await sharp(b.png).jpeg({quality:92}).toBuffer(),q)).toBe(url)
 })
 it('exports the existing two-sided CMYK print format',async()=>{
  const f=await renderBizcardFront({key,showTitle:'Autumn Sparkle',firstName:'Jordan'})
  const b=await renderBizcardBack({key,qrUrl:'https://example.com/card',qrIcon:'none',name:'Jordan Avery',email:'',website:'',textLinkNumber:'',social:'',fields:{name:true,email:false,website:false,textLink:false,social:false,discount:false}})
  const pdf=(await buildBizcardPrintPdf({front:f.png,back:b.png})).toString('latin1')
  expect(pdf).toContain('/Count 2')
  expect(pdf).toContain('/DeviceCMYK')
  expect(pdf).toContain('/TrimBox')
  expect(pdf).toContain('/BleedBox')
 })
})
it('retains the approved owl card artwork verbatim',()=>{
 const manifest=JSON.parse(readFileSync('scripts/card-qr/plate-sources/seasonal-cards/sources.json','utf8'))
 const source=manifest.sources.find((s:{path:string})=>s.path.endsWith('/fall-owl.jpg'))
 expect(createHash('sha256').update(readFileSync(source.path)).digest('hex')).toBe(source.sha256)
})
