import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from '../lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData as trade } from '../lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData as join } from '../lib/amethyst/join-template-data'
import { renderHomepageFirstPaint } from '../lib/amethyst/homepage-first-paint'
import { buildBizcardPrintPdf, renderBizcardFront, renderBizcardBack } from '../lib/workspace/card-qr/bizcard-render'
import { renderCardQrFlyerParts } from '../lib/workspace/card-qr/render'
import { resolveCardQrPalette } from '../lib/workspace/card-qr/palette'
import { assertFlyerQrDecodes } from '../lib/workspace/card-qr/flyer-decode'

async function main() {
  const out = process.argv[2]
  if (!out || !path.isAbsolute(out)) throw new Error('Provide an absolute proof directory.')
  fs.mkdirSync(out, { recursive: true })
  const theme = 'macies_christmas_globe'
  const key = 'macies-christmas-globe'
  const url = 'https://maingemco.com'
  const homepage = { ...defaultAmethystHomepageTemplateData, repName: 'Katelin', businessName: 'Main Gem Co.', heroHeadline: 'Christmas at Main Gem Co.', heroSub: 'Join Katelin and Macie Grey for live jewelry reveals.' }
  const template = fs.readFileSync('lib/amethyst/legacy/assets/Homepage.html', 'utf8')
  const html = await renderHomepageFirstPaint(template, { homepage, trade, join, appearancePreset: theme }, new URL('http://localhost/'), buildAmethystHomepageBootstrapScript(homepage, [], theme))
  const safeHtml = html.replace('<head>', '<head><base href="/amethyst/"><meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; form-action \'none\'">').replace('<body ', '<body data-review="local" ').replace('</body>', '<script>document.addEventListener("click",e=>{if(e.target.closest("a"))e.preventDefault()},true);document.addEventListener("submit",e=>e.preventDefault(),true)</script></body>')
  fs.writeFileSync(path.join(out, 'home.html'), safeHtml)
  const flyer = await renderCardQrFlyerParts({ palette: resolveCardQrPalette({ templateId: 'match-site', appearancePreset: theme }), appearancePreset: theme, showTitle: 'Main Gem Co.', tagline: 'Live jewelry reveals with Katelin and Macie Grey', firstName: 'Katelin', website: 'MAINGEMCO.COM', destinationUrl: url, showQr: true })
  const jpg = await sharp(flyer.flyer).jpeg({ quality: 92 }).toBuffer()
  await assertFlyerQrDecodes(flyer.flyer, url, flyer.layout.qr)
  await assertFlyerQrDecodes(jpg, url, flyer.layout.qr)
  fs.writeFileSync(path.join(out, 'Main Gem Co - QR flyer.png'), flyer.flyer)
  fs.writeFileSync(path.join(out, 'Main Gem Co - QR flyer.jpg'), jpg)
  const front = await renderBizcardFront({ key, showTitle: 'Main Gem Co.', firstName: 'Katelin' })
  const back = await renderBizcardBack({ key, qrUrl: url, qrIcon: 'none', name: 'Katelin Lawrence', email: '', website: 'maingemco.com', textLinkNumber: '', social: '', fields: { name: true, website: true, email: false, social: false, textLink: false, discount: false } })
  if (back.overflow || back.warnings.length) throw new Error('Back contact copy needs review.')
  const box = { x: back.layout.tile.x, y: back.layout.tile.y, width: back.layout.tile.size, height: back.layout.tile.size }
  await assertFlyerQrDecodes(back.png, url, box)
  await assertFlyerQrDecodes(await sharp(back.png).jpeg({ quality: 90 }).toBuffer(), url, box)
  fs.writeFileSync(path.join(out, 'Main Gem Co - business card front.png'), front.png)
  fs.writeFileSync(path.join(out, 'Main Gem Co - business card back.png'), back.png)
  fs.writeFileSync(path.join(out, 'Main Gem Co - business card print.pdf'), await buildBizcardPrintPdf({ front: front.png, back: back.png }))
  console.log(JSON.stringify({ verifiedDestination: url, flyerContentBottom: flyer.layout.contentBottom, flyerInstructions: flyer.layout.lowerPanel, cardCopy: front.boxes }))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
