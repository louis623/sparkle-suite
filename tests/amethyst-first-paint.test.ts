import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { defaultAmethystHomepageTemplateData, buildAmethystHomepageTweakDefaults, buildAmethystHomepageBootstrapScript } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { AMETHYST_APPEARANCE_PRESET_IDS } from '@/lib/amethyst/appearance-presets'

const html = readFileSync('public/amethyst/Homepage.html', 'utf8').replace('<div id="root"></div>', '<div id="root"><main class="public-index">old unstyled copy</main></div>')
describe('real themed first paint and autoplay defaults', () => {
  for (const preset of AMETHYST_APPEARANCE_PRESET_IDS) {
    it(`${preset} renders actual customer content before JavaScript and starts legacy Still as theme motion`, async () => {
      const homepage = { ...defaultAmethystHomepageTemplateData, businessName: 'First-paint shop <safe>', heroMotion: 'still' }
      const result = await renderHomepageFirstPaint(html, { appearancePreset: preset, homepage, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/review-shop'))
      expect(result).toContain('data-server-rendered="true"')
      const seed = JSON.parse(result.match(/window\.SPARKLE_FIRST_PAINT=(\{[^<]+\})<\/script>/)![1])
      expect(seed).toMatchObject({ locale: expect.any(String), timeZone: expect.any(String), now: expect.any(Number) })
      expect(result).toContain(`data-appearance-preset="${preset}"`)
      expect(result).toContain('First-paint shop &lt;safe&gt;')
      expect(result).toContain('--hp-primary:')
      expect(result).not.toContain('href="/amethyst/media-icons.svg#')
      expect(result).toContain('hp-customer-media-icon-svg')
      expect(result).not.toContain('old unstyled copy')
      expect(result).not.toContain('data-hero-motion="off"')
      expect(buildAmethystHomepageTweakDefaults(homepage, preset).heroMotion).not.toBe('still')
    })
  }
  it('isolates rep content across concurrent renders', async () => {
    const render = (name: string) => renderHomepageFirstPaint(html, { appearancePreset: 'amethyst', homepage: { ...defaultAmethystHomepageTemplateData, businessName: name }, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/'))
    const [a, b] = await Promise.all([render('Only Rep Alpha'), render('Only Rep Beta')])
    expect(a).toContain('Only Rep Alpha'); expect(a).not.toContain('Only Rep Beta')
    expect(b).toContain('Only Rep Beta'); expect(b).not.toContain('Only Rep Alpha')
  })
  it('keeps the complete bootstrap inline while fetching ordered classic dependencies without blocking parsing', async () => {
    const bootstrap = buildAmethystHomepageBootstrapScript()
    const result = await renderHomepageFirstPaint(html, { appearancePreset: 'amethyst', homepage: defaultAmethystHomepageTemplateData, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/'), bootstrap)
    expect(result).toContain('<script>window.AMETHYST_RUNTIME_CONTEXT')
    expect(result).not.toMatch(/<script\s+src=/)
    const dependencies = [...result.matchAll(/<script defer fetchpriority="low" src="([^"]+)"/g)].map(match => match[1])
    expect(dependencies[0]).toContain('react@18.3.1/umd/react.production.min.js')
    expect(dependencies[1]).toContain('react-dom@18.3.1/umd/react-dom.production.min.js')
    expect(dependencies.findIndex(src => src.includes('compiled/tweaks-panel.js'))).toBeLessThan(dependencies.findIndex(src => src.includes('compiled/homepage.js')))
  })
})

describe('saved show timezone in server HTML', () => {
  it.each([
    ['America/New_York', 'Sat, Oct 24', '9:00 PM EDT'],
    ['America/Los_Angeles', 'Sat, Oct 24', '6:00 PM PDT'],
    ['Asia/Tokyo', 'Sun, Oct 25', '10:00 AM GMT+9'],
  ])('%s retains the show day instead of the server UTC day', async (timeZone, day, time) => {
    const event = { id: 'timezone-proof', title: 'Timezone proof show', description: null, eventTime: '2026-10-25T01:00:00Z', timeZone, durationMinutes: 60, featured: false, codes: [], collections: [], platforms: [] }
    const bootstrap = buildAmethystHomepageBootstrapScript(defaultAmethystHomepageTemplateData, [event], 'amethyst', { targeted: true })
    const result = await renderHomepageFirstPaint(html, { appearancePreset: 'amethyst', homepage: defaultAmethystHomepageTemplateData, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/rep'), bootstrap)
    const body = result.split('<body')[1].replace(/<script[\s\S]*?<\/script>/g, '')
    expect(body).toContain(day)
    expect(body).toContain(time)
    expect(body).not.toContain(' UTC')
  })
})

it('ships a single accessible announcement before hydration', async () => {
  const homepage = { ...defaultAmethystHomepageTemplateData, tickerTopText: 'One announcement proof' }
  const result = await renderHomepageFirstPaint(html, { appearancePreset: 'amethyst', homepage, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/rep'))
  const body = result.split('<body')[1].replace(/<script[\s\S]*?<\/script>/g, '')
  expect(body.match(/One announcement proof/g)).toHaveLength(1)
  expect(body).not.toContain('class="hp-ticker-sr"')
})

it('keeps font binaries and full CSS in cacheable hashed files', async () => {
  const result = await renderHomepageFirstPaint(html, { appearancePreset: 'sunset_beach', homepage: defaultAmethystHomepageTemplateData, trade: defaultAmethystTradeTemplateData, join: defaultAmethystJoinTemplateData }, new URL('https://example.com/rep'))
  expect(result).not.toContain('data:font/woff2;base64')
  expect(result).not.toContain('data-stylesheet=')
  expect(result).toMatch(/href="\/amethyst\/delivery\/homepage\.[a-f0-9]{16}\.css"/)
  expect(result).toContain('data-critical-homepage')
  expect(Buffer.byteLength(result)).toBeLessThan(100_000)
})
