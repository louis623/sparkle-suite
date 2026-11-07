import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import sharp from 'sharp'
import manifest from '../lib/amethyst/legacy/manifest.json'
import { starlightThemeBootstrap } from '../lib/amethyst/starlight-theme-bootstrap'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '../lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '../lib/amethyst/trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '../lib/amethyst/join-template-data'
import { renderHomepageFirstPaint } from '../lib/amethyst/homepage-first-paint'
import { renderBizcardFront, renderBizcardBack, BIZCARD_SAFE_BOX } from '../lib/workspace/card-qr/bizcard-render'
import { decodeFlyerQr } from '../lib/workspace/card-qr/flyer-decode'
import { AMETHYST_APPEARANCE_PRESETS, normalizeAmethystAppearancePreset } from '../lib/amethyst/appearance-presets'

describe('Starlight Christmas Hollow', () => {
  it('normalizes the new community selection without changing existing selections', () => {
    expect(normalizeAmethystAppearancePreset('starlight_christmas_hollow')).toBe('starlight_christmas_hollow')
    expect(normalizeAmethystAppearancePreset('gnome_garden')).toBe('gnome_garden')
  })
  it('registers a real matching palette and community browsing card', () => {
    const p = AMETHYST_APPEARANCE_PRESETS['starlight_christmas_hollow' as keyof typeof AMETHYST_APPEARANCE_PRESETS]
    expect(p?.values.primaryColor).toBe('#f2c77b')
    const cards = readFileSync('lib/amethyst/skin-cards.ts', 'utf8')
    expect(cards).toMatch(/id: 'starlight_christmas_hollow',\s+visibility: 'community'/)
  })
  it('provides the real motion and separate music on disk', () => {
    expect(readFileSync('public/amethyst/skins/starlight-christmas-hollow/hero-loop.mp4').length).toBeGreaterThan(100000)
    expect(readFileSync('public/amethyst/skins/starlight-christmas-hollow/christmas-music-box.mp3').length).toBeGreaterThan(10000)
  })
  it('supplies complete defaults on all three legacy pages and safely skips non-browser rendering', () => {
    const scripts = [
      [buildAmethystHomepageBootstrapScript(homepage, [], 'starlight_christmas_hollow'), 'HOMEPAGE'],
      [buildAmethystTradeBootstrapScript(trade, [], 'starlight_christmas_hollow'), 'TRADE'],
      [buildAmethystJoinBootstrapScript(join, 'starlight_christmas_hollow'), 'JOIN'],
    ]
    for (const [script, key] of scripts) {
      const window: Record<string, any> = {}
      runInNewContext(script, { window, document: { getElementById: () => ({}), documentElement: { style: { setProperty() {} } } } })
      expect(window[key + '_TWEAK_DEFAULTS']).toMatchObject({ preset: 'starlight_christmas_hollow', primaryColor: '#f2c77b', headingFont: 'playfair' })
    }
    expect(starlightThemeBootstrap('gnome_garden')).toBe('')
  })
  it('preserves every frozen asset and existing render selection source', () => {
    const entries=Object.entries(manifest.files)
    const paths=entries.map(([name,record])=>(record.source==='snapshot'?'lib/amethyst/legacy/assets/':'public/amethyst/')+name)
    // Frozen snapshots contain mixed original line endings; this Windows
    // checkout may add CRLF. Accept only the original bytes or LF-equivalent.
    entries.forEach(([name,record],i)=>{
      const bytes=readFileSync(paths[i])
      const hashes=[createHash('sha256').update(bytes).digest('hex')]
      if (/\.(jsx?|css|html|md)$/.test(name)) hashes.push(createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex'))
      // The verified remote baseline includes acd1a823's approved consent-copy
      // correction. Its old snapshot manifest was not refreshed by that change.
      // Lock the actual 0e136f56 source here; do not rewrite that historical manifest.
      const baseline = name === 'homepage.jsx' && record.source === 'snapshot'
        ? 'eebebf2e0a695dc9d7dfcc7f8834861d89efeb817146a26ac9ade1716ba03200'
        : record.sha256
      expect(hashes,name).toContain(baseline)
    })
  })
  it('renders the new theme from frozen HTML with first-paint styles and the correct controller', async () => {
    const source=readFileSync('lib/amethyst/legacy/assets/Homepage.html','utf8')
    for (const publicSiteVariant of [undefined,'mile_high_fizz_hybrid','britt_with_bling_hybrid','bling_kitchen_hybrid'] as const) {
      const saved={...homepage,publicSiteVariant}
      const html=await renderHomepageFirstPaint(source,{homepage:saved,join,trade,appearancePreset:'starlight_christmas_hollow'},new URL('https://example.com/'),buildAmethystHomepageBootstrapScript(saved,[],'starlight_christmas_hollow'))
      expect(html).toContain('data-server-rendered="true"')
      expect(html).toContain('data-customer-theme="starlight_christmas_hollow"')
      expect(html.match(/data-ssr-style="starlight-christmas-hollow.css"/g)).toHaveLength(1)
      expect(html).toContain('src="/amethyst/ssr-motion/starlight-christmas-hollow.js"')
      expect(html).not.toContain('react.development')
      expect(html.match(/<h1\b/g)).toHaveLength(1)
    }
  })
  it('keeps normal and longer card copy inside print bounds and above the gnomes', async () => {
    for(const showTitle of ['Christmas Sparkle','A Little Sparkle for Every Season']) {
      const front=await renderBizcardFront({key:'starlight-christmas-hollow',showTitle,firstName:'Alexandria'})
      for(const box of front.boxes) {
        expect(box.x).toBeGreaterThanOrEqual(BIZCARD_SAFE_BOX.x0-1)
        expect(box.x2).toBeLessThanOrEqual(BIZCARD_SAFE_BOX.x1+1)
        expect(box.y).toBeGreaterThanOrEqual(BIZCARD_SAFE_BOX.y0-1)
        expect(box.y2).toBeLessThan(390)
      }
    }
  })
  it('decodes the real business card QR in PNG and JPEG', async () => {
    const url='https://example.com/starlight-review'
    const b=await renderBizcardBack({key:'starlight-christmas-hollow',qrUrl:url,qrIcon:'none',name:'Sample Rep',email:'hello@example.com',website:'example.com',textLinkNumber:'',social:'',fields:{name:true,email:true,website:true,textLink:false,social:false,discount:false}})
    expect(b.overflow).toBe(false)
    const q={x:b.layout.tile.x,y:b.layout.tile.y,width:b.layout.tile.size,height:b.layout.tile.size}
    expect(await decodeFlyerQr(b.png,q)).toBe(url)
    expect(await decodeFlyerQr(await sharp(b.png).jpeg({quality:92}).toBuffer(),q)).toBe(url)
  })
})
