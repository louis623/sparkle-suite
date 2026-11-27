import { expect, it } from 'vitest'
import sharp from 'sharp'
import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderBizcardFront,renderBizcardBack,buildBizcardPrintPdf,BIZCARD_SAFE_BOX } from '@/lib/workspace/card-qr/bizcard-render'
import { decodeFlyerQr } from '@/lib/workspace/card-qr/flyer-decode'
import { renderCardQrFlyerParts } from '@/lib/workspace/card-qr/render'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { getCommunityAmethystSkinCards } from '@/lib/amethyst/skin-cards'
const appearancePreset='christmas_jewelry_workshop'
const key='christmas-jewelry-workshop'
const destinationUrl='https://example.com/workshop'
it('offers the workshop to Community reps and exports both QR print formats with their own site destination',async()=>{
  expect(getCommunityAmethystSkinCards().some(card=>card.id===appearancePreset && card.label==='Christmas Jewelry Workshop')).toBe(true)
  const palette=resolveCardQrPalette({templateId:'match-site',appearancePreset})
  const showTitle='Evergreen Jewelry'
  const flyer=await renderCardQrFlyerParts({appearancePreset,palette,destinationUrl,showQr:true,showTitle,firstName:'Avery',tagline:'Join me for live jewelry reveals',website:'example.com/workshop',qrIcon:'none'})
  const front=await renderBizcardFront({key,showTitle,firstName:'Avery'})
  const long=await renderBizcardFront({key,showTitle:'Twinkling Treasures and Jewelry Reveals',firstName:'Alexandria'})
  expect([...front.boxes,...long.boxes].every(b=>b.x>=BIZCARD_SAFE_BOX.x0-1 && b.x2<=BIZCARD_SAFE_BOX.x1+1 && b.y>=BIZCARD_SAFE_BOX.y0-1 && b.y2<=BIZCARD_SAFE_BOX.y1+1)).toBe(true)
  const back=await renderBizcardBack({key,qrUrl:destinationUrl,qrIcon:'none',fields:{name:true,email:true,website:true,textLink:true,social:true,discount:true},name:'Avery Winters',email:'hello@example.com',website:'example.com/workshop',textLinkNumber:'202-555-0147',social:'@evergreenjewelry',socialPlatform:'instagram'})
  expect(back.overflow).toBe(false)
  expect(back.warnings).toEqual([])
  const tile=back.layout.tile
  for(const [bytes,box] of [[back.png,{x:tile.x,y:tile.y,width:tile.size,height:tile.size}],[flyer.flyer,flyer.layout.qr]] as const){
    expect(await decodeFlyerQr(bytes,box)).toBe(destinationUrl)
    expect(await decodeFlyerQr(await sharp(bytes).jpeg({quality:92}).toBuffer(),box)).toBe(destinationUrl)
  }
  const pdf=await buildBizcardPrintPdf({front:front.png,back:back.png})
  for(const marker of ['/Count 2','/DeviceCMYK','/TrimBox','/BleedBox'])expect(pdf.toString('latin1').includes(marker)).toBe(true)
  const dir=process.env.WORKSHOP_PROOF_DIR
  if(dir){mkdirSync(dir,{recursive:true});for(const [file,bytes] of Object.entries({'flyer.png':flyer.flyer,'card-front.png':front.png,'card-back.png':back.png,'business-card.pdf':pdf}))writeFileSync(join(dir,file),bytes)}
},45000)

import { readFileSync } from 'node:fs'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as joinPage } from '@/lib/amethyst/join-template-data'

it('renders the workshop assets on Home, Dance Floor and Join with rep-owned copy',async()=>{
  const ctx={targeted:true}
  for(const [page,file,script] of [
    ['homepage','Homepage',buildAmethystHomepageBootstrapScript(homepage,[],appearancePreset,ctx)],
    ['trade','Trade',buildAmethystTradeBootstrapScript(trade,[],appearancePreset,ctx)],
    ['join','Join',buildAmethystJoinBootstrapScript(joinPage,appearancePreset,ctx)]
  ] as const){
    const url=new URL('http://localhost:4187/'+page)
    const html=await renderAmethystPageFirstPaint(page,readFileSync('public/amethyst/'+file+'.html','utf8'),{homepage,trade,join:joinPage,appearancePreset},url,script)
    expect(html).toContain('data-customer-theme="christmas_jewelry_workshop"')
    expect(html).toContain('/amethyst/ssr-motion/christmas-jewelry-workshop.js')
    if(page==='homepage'){
      expect(html).toContain('class="cjw-video"')
      expect(html).toContain('Play sound')
      expect(html).not.toContain('cjw-mute')
    }
    if(process.env.WORKSHOP_PROOF_DIR)writeFileSync(join(process.env.WORKSHOP_PROOF_DIR,page+'.html'),html)
  }
})
