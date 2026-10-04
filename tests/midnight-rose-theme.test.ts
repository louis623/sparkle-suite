import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { getAmethystAppearancePreset, normalizeAmethystAppearancePreset, DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { buildSkinPreviewDocument, skinPreviewMediaSource, renderSkinPreview } from '@/lib/amethyst/skin-preview'

describe('RG-02 Midnight Rose community theme', () => {
  it('recognizes id, name and code while preserving RG-01 and the current default', () => {
    for (const selection of ['midnight_rose', 'Midnight Rose', 'RG-02']) expect(normalizeAmethystSkinSelection(selection)).toBe('midnight_rose')
    expect(normalizeAmethystAppearancePreset('midnight_rose')).toBe('midnight_rose')
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
    expect(normalizeAmethystSkinSelection('Rose Gold')).toBe('rose_gold')
    expect(getCommunityAmethystSkinCards().find(card => card.id === 'midnight_rose')).toMatchObject({
      code: 'RG-02', label: 'Midnight Rose', visibility: 'community', previewHref: '/skin-preview/midnight_rose/homepage',
      headingFont: 'Playfair Display', bodyFont: 'DM Sans',
    })
  })

  it('uses the approved palette on Home, Trade and Join without changing Amethyst font metrics or flow data', () => {
    const expected = { preset: 'midnight_rose', primaryColor: '#efb5a3', accentColor: '#d29b82',
      bgTone: 'midnightRose', bgTreatment: 'midnight-rose', cardSurface: 'midnight-rose',
      headingFont: 'playfair', bodyFont: 'dmSans', headingWeight: 600,
      shapeRadius: 'soft', density: 'regular', tickerSpeed: 1, heroMotion: 'sparkle_rise' }
    expect(getAmethystAppearancePreset('midnight_rose').label).toBe('Midnight Rose')
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData, 'midnight_rose')).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData, 'midnight_rose')).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData, 'midnight_rose')).toMatchObject(expected)
    for (const page of ['homepage', 'trade', 'join']) {
      const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
      expect(source).toContain('{ value: "midnight_rose", label: "Midnight Rose" }')
      expect(source).toContain('body.classList.add("bg-midnight-rose")')
    }
  })

  it('renders Preferences with the selected theme and leaves other visual branches intact', () => {
    const source = readFileSync('public/amethyst/unsubscribe.jsx', 'utf8')
    const snippet = source.slice(source.indexOf('function applyUnsubscribeAppearance()'), source.indexOf('applyUnsubscribeAppearance();')) + '\napplyUnsubscribeAppearance();'
    const classes = new Set<string>(), tokens: Record<string, string> = {}
    runInNewContext(snippet, { window: { HOMEPAGE_TWEAK_DEFAULTS: { preset: 'midnight_rose' } }, document: {
      body: { classList: { add: (...names: string[]) => names.forEach(name => classes.add(name)) } },
      documentElement: { style: { setProperty: (name: string, value: string) => { tokens[name] = value } } },
    } })
    expect([...classes]).toContain('bg-midnight-rose')
    expect(tokens).toMatchObject({ '--hp-primary': '#efb5a3', '--hp-display-font': '"Playfair Display", Georgia, serif', '--hp-heading-weight': '600' })
  })

  it.each(['homepage', 'trade', 'join', 'unsubscribe'] as const)('renders a safe real-component %s sample with only its own hosted media', async page => {
    const origin = 'https://sparkle-suite-smoke.vercel.app'
    const doc = await buildSkinPreviewDocument('midnight_rose', page, origin)
    expect(doc).toContain('midnight-rose.css')
    expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain("connect-src 'none'; form-action 'none'")
    expect(doc).toContain('Uploads are unavailable in this sample preview')
    expect(skinPreviewMediaSource('midnight_rose', origin)).toBe(origin + '/amethyst/skins/midnight-rose/')
    if (page === 'homepage') {
      expect(doc).toContain('Real jewelry. Live reveals. Pure sparkle.')
      expect(doc).toContain('id="rgc-preview-icon-video"')
    }
    const outer = await renderSkinPreview('midnight_rose', page, origin)
    expect(outer).toContain('Theme preview · Sample content')
    expect(outer).toContain('sandbox="allow-scripts"')
    expect(outer).not.toContain('allow-same-origin')
  })

  it('extends the database constraint and Community catalog without rewriting existing account selections', () => {
    const sql = readFileSync('supabase/migrations/20261004000100_add_midnight_rose.sql', 'utf8')
    for (const id of ['amethyst', 'sparkle_suite_morganite', 'rose_gold', 'midnight_rose', 'gilded_autumn', 'pearl', 'luxe', 'ocean_sapphire', 'neon_butterfly']) expect(sql).toContain(`'${id}'`)
    expect(sql).toContain("('midnight_rose', 'community', NULL, false)")
    expect(sql).not.toMatch(/UPDATE\s+public\.site_settings/i)
  })

  it('uses readable semantic dark surfaces and leaves shared chrome geometry untouched', () => {
    const css = readFileSync('public/amethyst/midnight-rose.css', 'utf8')
    for (const token of ['--hp-card-fg: #fff0e8', '--hp-card-muted: #dbc0bb', '--hp-card-accent: #efb5a3', '--hp-form-panel-bg: #271920', '--hp-field-fg: #fff0e8']) expect(css).toContain(token)
    for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      expect(selector).toContain('body.bg-midnight-rose')
      if (/hp-header|hp-ticker|hp-lrq|hp-lineup/.test(selector)) expect(declarations).not.toMatch(/(?:^|;)\s*(?:position|display|margin|padding|gap|height|width|font|line-height|animation|transform|overflow)[\w-]*\s*:/)
    }
  })

  it('gives the actual Featured badge and its pip readable ink on the copper surface', () => {
    const homepage = readFileSync('public/amethyst/homepage.jsx', 'utf8')
    const css = readFileSync('public/amethyst/midnight-rose.css', 'utf8')
    const badgeClass = homepage.match(/className="([a-z-]+)"><span className="pip" \/>Featured<\/span>/)![1]
    const badge = css.match(new RegExp(`body\\.bg-midnight-rose \\.${badgeClass}\\s*\\{([^}]+)\\}`))![1]
    const background = badge.match(/background:\s*(#[a-f0-9]{6})/)![1]
    const ink = badge.match(/(?:^|;)\s*color:\s*(#[a-f0-9]{6})/)![1]
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const contrast = (luminance(background) + 0.05) / (luminance(ink) + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(new RegExp(`body\\.bg-midnight-rose \\.${badgeClass} \\.pip\\s*\\{[^}]*background:\\s*${ink}`))
  })
})
