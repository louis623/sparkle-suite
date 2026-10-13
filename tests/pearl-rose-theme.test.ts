import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { getAmethystAppearancePreset, normalizeAmethystAppearancePreset, DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { buildSkinPreviewDocument, skinPreviewMediaSource, renderSkinPreview } from '@/lib/amethyst/skin-preview'

describe('RG-03 Pearl Rose community theme', () => {
  it('recognizes id, name and code while preserving RG-01 and the current default', () => {
    for (const selection of ['pearl_rose', 'Pearl Rose', 'RG-03']) expect(normalizeAmethystSkinSelection(selection)).toBe('pearl_rose')
    expect(normalizeAmethystAppearancePreset('pearl_rose')).toBe('pearl_rose')
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
    expect(normalizeAmethystSkinSelection('Rose Gold')).toBe('rose_gold')
    expect(getCommunityAmethystSkinCards().find(card => card.id === 'pearl_rose')).toMatchObject({
      code: 'RG-03', label: 'Pearl Rose', visibility: 'community', previewHref: '/skin-preview/pearl_rose/homepage',
      headingFont: 'Playfair Display', bodyFont: 'DM Sans',
    })
  })

  it('uses the approved palette on Home, Trade and Join without changing Amethyst font metrics or flow data', () => {
    const expected = { preset: 'pearl_rose', primaryColor: '#954354', accentColor: '#d29b82',
      bgTone: 'pearlRose', bgTreatment: 'pearl-rose', cardSurface: 'pearl-rose-paper',
      headingFont: 'playfair', bodyFont: 'dmSans', headingWeight: 600,
      shapeRadius: 'soft', density: 'regular', tickerSpeed: 1, heroMotion: 'sparkle_rise' }
    expect(getAmethystAppearancePreset('pearl_rose').label).toBe('Pearl Rose')
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData, 'pearl_rose')).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData, 'pearl_rose')).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData, 'pearl_rose')).toMatchObject(expected)
    for (const page of ['homepage', 'trade', 'join']) {
      const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
      expect(source).toContain('{ value: "pearl_rose", label: "Pearl Rose" }')
      expect(source).toContain('body.classList.add("bg-pearl-rose")')
    }
  })

  it('renders Preferences with the selected theme and leaves other visual branches intact', () => {
    const source = readFileSync('public/amethyst/unsubscribe.jsx', 'utf8')
    const snippet = source.slice(source.indexOf('function applyUnsubscribeAppearance()'), source.indexOf('applyUnsubscribeAppearance();')) + '\napplyUnsubscribeAppearance();'
    const classes = new Set<string>(), tokens: Record<string, string> = {}
    runInNewContext(snippet, { window: { HOMEPAGE_TWEAK_DEFAULTS: { preset: 'pearl_rose' } }, document: {
      body: { classList: { add: (...names: string[]) => names.forEach(name => classes.add(name)) } },
      documentElement: { style: { setProperty: (name: string, value: string) => { tokens[name] = value } } },
    } })
    expect([...classes]).toContain('bg-pearl-rose')
    expect(tokens).toMatchObject({ '--hp-primary': '#954354', '--hp-display-font': '"Playfair Display", Georgia, serif', '--hp-heading-weight': '600' })
  })

  it.each(['homepage', 'trade', 'join', 'unsubscribe'] as const)('renders a safe real-component %s sample with only its own hosted media', async page => {
    const origin = 'https://sparkle-suite-smoke.vercel.app'
    const doc = await buildSkinPreviewDocument('pearl_rose', page, origin)
    expect(doc).toContain('pearl-rose.css')
    expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain("connect-src 'none'; form-action 'none'")
    expect(doc).toContain('Uploads are unavailable in this sample preview')
    expect(skinPreviewMediaSource('pearl_rose', origin)).toBe(origin + '/amethyst/skins/pearl-rose/')
    if (page === 'homepage') {
      expect(doc).toContain('Real jewelry. Live reveals. Pure sparkle.')
      expect(doc).toContain('id="rgc-preview-icon-video"')
    }
    const outer = await renderSkinPreview('pearl_rose', page, origin)
    expect(outer).toContain('Theme preview · Sample content')
    expect(outer).toContain('sandbox="allow-scripts"')
    expect(outer).not.toContain('allow-same-origin')
  })

  it('extends the database constraint and Community catalog without rewriting existing account selections', () => {
    const sql = readFileSync('supabase/migrations/20261004000200_add_pearl_rose.sql', 'utf8')
    for (const id of ['amethyst', 'sparkle_suite_morganite', 'rose_gold', 'pearl_rose', 'gilded_autumn', 'pearl', 'luxe', 'ocean_sapphire', 'neon_butterfly']) expect(sql).toContain(`'${id}'`)
    expect(sql).toContain("('pearl_rose', 'community', NULL, false)")
    expect(sql).not.toMatch(/UPDATE\s+public\.site_settings/i)
  })

  it('uses readable semantic light surfaces and leaves shared chrome geometry untouched', () => {
    const css = readFileSync('public/amethyst/pearl-rose.css', 'utf8')
    for (const token of ['--hp-card-fg: #4d2931', '--hp-card-muted: #785963', '--hp-card-accent: #954354', '--hp-form-panel-bg: #fffefa', '--hp-field-fg: #4d2931']) expect(css).toContain(token)
    for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      expect(selector).toContain('body.bg-pearl-rose')
      if (/hp-header|hp-ticker|hp-lrq|hp-lineup/.test(selector)) expect(declarations).not.toMatch(/(?:^|;)\s*(?:position|display|margin|padding|gap|height|width|font|line-height|animation|transform|overflow)[\w-]*\s*:/)
    }
  })

  it('keeps copper gradient circle labels readable at every gradient stop', () => {
    const css = readFileSync('public/amethyst/pearl-rose.css', 'utf8')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const circle = rules.find(([, selector, declarations]) => selector.includes('.hp-step-num') && declarations.includes('linear-gradient'))!
    expect(circle[1]).toContain('.jp-benefit-icon')
    expect(circle[1]).toContain('.hp-trade-preview-pill .pos')
    const stops = [...circle[2].match(/background:\s*([^;]+)/)![1].matchAll(/#[a-f0-9]{6}/g)].map(match => match[0])
    const ink = circle[2].match(/(?:^|;)\s*color:\s*(#[a-f0-9]{6})/)![1]
    const luminance = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    expect(stops).toHaveLength(3)
    for (const stop of stops) {
      const levels = [luminance(stop), luminance(ink)].sort((a, b) => b - a)
      expect((levels[0] + 0.05) / (levels[1] + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('gives the actual Featured badge and its pip readable ink on the burgundy surface', () => {
    const homepage = readFileSync('public/amethyst/homepage.jsx', 'utf8')
    const css = readFileSync('public/amethyst/pearl-rose.css', 'utf8')
    const badgeClass = homepage.match(/className="([a-z-]+)"><span className="pip" \/>Featured<\/span>/)![1]
    const badge = css.match(new RegExp(`body\\.bg-pearl-rose \\.${badgeClass}\\s*\\{([^}]+)\\}`))![1]
    const background = badge.match(/background:\s*(#[a-f0-9]{6})/)![1]
    const ink = badge.match(/(?:^|;)\s*color:\s*(#[a-f0-9]{6})/)![1]
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const levels = [luminance(background), luminance(ink)].sort((a, b) => b - a)
    const contrast = (levels[0] + 0.05) / (levels[1] + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(new RegExp(`body\\.bg-pearl-rose \\.${badgeClass} \\.pip\\s*\\{[^}]*background:\\s*${ink}`))
  })
})
