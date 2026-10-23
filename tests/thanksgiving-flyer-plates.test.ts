import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe,it,expect} from 'vitest'
import sharp from 'sharp'
import {flyerThemeRecord} from '@/lib/workspace/card-qr/flyer-themes'
import {renderCardQrFlyerParts} from '@/lib/workspace/card-qr/render'
import {resolveCardQrPalette} from '@/lib/workspace/card-qr/palette'
import {assertFlyerQrDecodes} from '@/lib/workspace/card-qr/flyer-decode'

const themes=[
 {theme:'gobble_and_fizz',folder:'gobble-and-fizz',hero:'hero-poster.webp',hash:'a78c049be1137a38b40e0a4e131be568d602b2e7d03690abd6f31b322f2f9372',sourceBox:{left:550,top:10,width:700,height:625},placed:{left:330,top:1545,width:420,height:375},details:[
  {name:'turkey face',left:775,top:145,width:75,height:70},
  {name:'copper fizz pot',left:635,top:467,width:165,height:90},
  {name:'amber gem',left:725,top:377,width:32,height:27},
 ]},
 {theme:'pie_please',folder:'pie-please',hero:'hero-poster-v4.webp',hash:'dd0fe24624eca6e540e8e33949cbb85e7a224ce5cfcaaba711b59196aa49e27c',sourceBox:{left:450,top:245,width:830,height:475},placed:{left:430,top:1548,width:650,height:372},details:[
  {name:'whipped cream',left:1050,top:350,width:140,height:70},
  {name:'jeweled tray',left:610,top:470,width:30,height:30},
  {name:'pie crust',left:800,top:340,width:80,height:40},
 ]},
] as const

for(const t of themes)describe(t.folder+' original-art QR flyer',()=>{
 const hero=`public/amethyst/skins/${t.folder}/${t.hero}`
 const plate=`public/amethyst/skins/${t.folder}/flyer/plate.webp`
 const subject=`scripts/card-qr/plate-sources/${t.folder}/subject.png`
 it('uses a dedicated 1080×1920 plate without changing the approved source',async()=>{
  expect(flyerThemeRecord(t.theme)).toMatchObject({source:hero,plate})
  expect(createHash('sha256').update(readFileSync(hero)).digest('hex')).toBe(t.hash)
  expect(await sharp(plate).metadata()).toMatchObject({width:1080,height:1920,format:'webp'})
 })
 for(const {name,...box} of t.details)it(`preserves ${name} source pixels and encoded detail`,async()=>{
  const original=await sharp(hero).extract(box).removeAlpha().raw().toBuffer()
  const cutout=await sharp(subject).extract({...box,left:box.left-t.sourceBox.left,top:box.top-t.sourceBox.top}).removeAlpha().raw().toBuffer()
  expect(cutout.equals(original)).toBe(true)
  const sx=t.placed.width/t.sourceBox.width,sy=t.placed.height/t.sourceBox.height
  const mapped={left:t.placed.left+Math.round((box.left-t.sourceBox.left)*sx),top:t.placed.top+Math.round((box.top-t.sourceBox.top)*sy),width:Math.round(box.width*sx),height:Math.round(box.height*sy)}
  const expected=await sharp(original,{raw:{width:box.width,height:box.height,channels:3}}).resize(mapped.width,mapped.height).raw().toBuffer()
  const actual=await sharp(plate).extract(mapped).removeAlpha().raw().toBuffer()
  const mae=expected.reduce((sum,value,i)=>sum+Math.abs(value-actual[i]),0)/expected.length
  expect(mae).toBeLessThan(18)
 })
 for(const title of ['Autumn Sparkle','A Very Long Autumn Jewelry Shop Name'])it(`clears artwork and decodes centered PNG/JPEG QR for ${title}`,async()=>{
  const url=`https://example.com/${t.folder}-review`
  const p=await renderCardQrFlyerParts({palette:resolveCardQrPalette({templateId:'match-site',appearancePreset:t.theme}),appearancePreset:t.theme,showTitle:title,tagline:'A little sparkle for your season',firstName:'Sample Rep',website:'example.com',destinationUrl:url,showQr:true})
  expect(p.layout.qr.x+p.layout.qr.width/2).toBe(540)
  expect(p.layout.contentBottom).toBeLessThan(t.placed.top)
  await expect(assertFlyerQrDecodes(p.flyer,url,p.layout.qr)).resolves.toBeUndefined()
  await expect(assertFlyerQrDecodes(await sharp(p.flyer).jpeg({quality:92}).toBuffer(),url,p.layout.qr)).resolves.toBeUndefined()
 })
})
