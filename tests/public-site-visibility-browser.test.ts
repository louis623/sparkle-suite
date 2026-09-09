import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { expect, it } from 'vitest'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'

// Optional browser suite: use an installed Playwright or an explicitly supplied
// runtime package path without adding a product dependency.
const chromium = (() => {
  try { return createRequire(import.meta.url)(process.env.VISIBILITY_PLAYWRIGHT_PATH || 'playwright').chromium }
  catch (error) { if (process.env.VISIBILITY_PLAYWRIGHT_PATH) throw error; return null }
})()

it.skipIf(!chromium)('hides and restores the actual public homepage links, ticker rows and lineup', async () => {
  const source = readFileSync('public/amethyst/tweaks-panel.jsx', 'utf8') + '\n' + readFileSync('public/amethyst/homepage.jsx', 'utf8')
  const bundle = await build({ stdin: { contents: `import React from 'react'; import ReactDOM from 'react-dom/client'; window.React = React; window.ReactDOM = ReactDOM;\n${source}`, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.route('**/*', (route: { abort(): Promise<void> }) => route.abort())
    for (const publicSiteVariant of [undefined, 'mile_high_fizz_hybrid', 'britt_with_bling_hybrid', 'bling_kitchen_hybrid'] as const) {
    for (const visible of [true, false, true]) {
      await page.setContent('<html><head></head><body><div id="root"></div></body></html>')
      await page.addScriptTag({ content: readFileSync('public/amethyst/live-lineup.js', 'utf8') })
      await page.addScriptTag({ content: buildAmethystHomepageBootstrapScript({ ...defaultAmethystHomepageTemplateData, publicSiteVariant, footerLinks: { ...defaultAmethystHomepageTemplateData.footerLinks, joinTeam: visible ? defaultAmethystHomepageTemplateData.footerLinks.joinTeam : undefined }, visibility: { announcements: visible, danceFloor: visible, liveLineup: visible, joinTeam: visible } }) })
      await page.addScriptTag({ content: bundle.outputFiles[0].text })
      await page.waitForSelector('.hp-header')
      expect(await page.locator('.hp-header a[href*="Trade.html"]').first().isVisible()).toBe(visible)
      expect(await page.locator('.hp-ticker-row:not(.reverse)').first().isVisible()).toBe(visible)
      expect(await page.locator('.hp-ticker-row.reverse').first().isVisible()).toBe(visible)
      expect(await page.locator('.hp-trade-preview').first().isVisible()).toBe(visible)
      for (const link of await page.locator('.mhf-cta-join, .bwb-cta-join').all()) expect(await link.isVisible()).toBe(visible)
    }
    }
  } finally { await browser.close() }
}, 60000)

it.skipIf(!chromium)('groups accessible switches with reversible keyboard changes and locked Join Team', async () => {
  const bundle = await build({ stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { PublicSiteVisibility } from './app/nic-nac/components/PublicSiteVisibility'; function App() { const [settings, setSettings] = React.useState({ tickerVisible: true, showJoinPage: true, danceFloorVisible: true, liveLineupVisible: true }); return <PublicSiteVisibility settings={settings} joinTeamAccessEnabled={false} onChange={patch => setSettings(previous => ({ ...previous, ...patch }))} />; } createRoot(document.getElementById('root')).render(<App />);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, outdir: 'unused-browser-output', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' }, jsx: 'automatic' })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.setContent('<html><head></head><body><div id="root"></div></body></html>')
    for (const output of bundle.outputFiles) {
      if (output.path.endsWith('.css')) await page.addStyleTag({ content: output.text })
      else await page.addScriptTag({ content: output.text })
    }
    const danceFloor = page.getByRole('switch', { name: 'Dance Floor', exact: true })
    await danceFloor.waitFor()
    expect(await page.getByRole('switch').count()).toBe(4)
    expect(await page.getByRole('switch', { name: 'Join Team', exact: true }).isDisabled()).toBe(true)
    await danceFloor.focus()
    await page.keyboard.press('Space')
    expect(await danceFloor.isChecked()).toBe(false)
    await page.keyboard.press('Space')
    expect(await danceFloor.isChecked()).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (process.env.VISIBILITY_CAPTURE === '1') {
      await page.screenshot({ path: 'artifacts/public-site-visibility-mobile.png', fullPage: true })
      await page.setViewportSize({ width: 1200, height: 750 })
      await page.screenshot({ path: 'artifacts/public-site-visibility-desktop.png', fullPage: true })
    }
  } finally { await browser.close() }
}, 60000)
