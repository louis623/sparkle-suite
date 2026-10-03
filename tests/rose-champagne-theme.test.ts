import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'

const luminance = (hex: string) => {
  const rgb = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
const contrast = (first: string, second: string) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

describe('RG-01 Rose Champagne theme compatibility', () => {
  it('applies the RG-01 palette to customer preferences without altering other theme branches', () => {
    const source = readFileSync('public/amethyst/unsubscribe.jsx', 'utf8')
    const start = source.indexOf('function applyUnsubscribeAppearance()')
    const end = source.indexOf('applyUnsubscribeAppearance();')
    const apply = source.slice(start, end) + '\napplyUnsubscribeAppearance();'
    const render = (preset: string) => {
      const classes = new Set<string>()
      const tokens: Record<string, string> = {}
      runInNewContext(apply, {
        window: { HOMEPAGE_TWEAK_DEFAULTS: { preset } },
        document: {
          body: { classList: { add: (...values: string[]) => values.forEach(value => classes.add(value)) } },
          documentElement: { style: { setProperty: (name: string, value: string) => { tokens[name] = value } } },
        },
      })
      return { classes: [...classes], tokens }
    }
    expect(render('rose_gold')).toMatchObject({
      classes: ['bg-rose-gold-paper', 'surface-pearl-rose', 'shape-soft'],
      tokens: {
        '--hp-primary': '#a04e5d', '--hp-accent': '#d29b82',
        '--hp-display-font': '"Playfair Display", Georgia, serif',
        '--hp-body-font': '"DM Sans", "Inter", system-ui, sans-serif',
        '--hp-heading-weight': '600',
      },
    })
    expect(render('gnome_garden').classes).toContain('bg-gnome-garden')
    expect(render('halloween_pumpkin_cat').classes).toContain('bg-halloween-pumpkin-cat')
    expect(render('sparkle_suite_morganite').classes).toEqual([])
    expect(readFileSync('public/amethyst/Unsubscribe.html', 'utf8')).toContain('unsubscribe.jsx?v=20261003-rg01-v1')
  })

  it('keeps saved Rose Gold selections and Community availability under the new display name', () => {
    for (const selection of ['rose_gold', 'RG-01', 'Rose Gold', 'Rose Champagne']) {
      expect(normalizeAmethystSkinSelection(selection)).toBe('rose_gold')
    }
    expect(getCommunityAmethystSkinCards().find(card => card.id === 'rose_gold')).toMatchObject({
      code: 'RG-01', label: 'Rose Champagne', visibility: 'community', aliases: ['Rose Gold'],
    })
  })

  it('applies the approved palette on all pages without changing fonts, geometry or ticker speed', () => {
    const expected = {
      preset: 'rose_gold', primaryColor: '#a04e5d', accentColor: '#d29b82',
      headingFont: 'playfair', bodyFont: 'dmSans', headingWeight: 600,
      shapeRadius: 'soft', density: 'regular', saturation: 108,
      heroMotion: 'sparkle_rise', tickerSpeed: 1,
    }
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData, 'rose_gold')).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData, 'rose_gold')).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData, 'rose_gold')).toMatchObject(expected)
    expect(getAmethystAppearancePreset('rose_gold').label).toBe('Rose Champagne')
    for (const page of ['homepage', 'trade', 'join']) {
      const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
      const preset = source.match(/rose_gold:\s*\{([\s\S]*?)\n  \}/)?.[1]
      expect(preset).toContain('primaryColor: "#a04e5d"')
      expect(preset).toContain('accentColor: "#d29b82"')
      expect(source).toContain('{ value: "rose_gold", label: "Rose Champagne" }')
    }
  })

  it('uses scoped semantic colors for light cards, forms and shared customer chrome', () => {
    const css = readFileSync('public/amethyst/rose-champagne.css', 'utf8')
    for (const token of ['--hp-card-fg: #45252e', '--hp-card-muted: #765760', '--hp-card-accent: #a04e5d',
      '--hp-form-panel-bg: #fffdfb', '--hp-form-panel-fg: #45252e', '--hp-field-bg: #fffdfb', '--hp-field-fg: #45252e']) {
      expect(css).toContain(token)
    }
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    expect(rules.length).toBeGreaterThan(5)
    for (const [, selector, declarations] of rules) {
      expect(selector).toContain('body.bg-rose-gold-paper')
      if (/hp-header|hp-ticker|hp-lrq|hp-lineup/.test(selector)) {
        expect(declarations).not.toMatch(/(?:^|;)\s*(?:position|display|margin|padding|gap|height|width|font|line-height|animation|transform|overflow)[\w-]*\s*:/)
      }
    }
  })

  it('keeps normal-size text and action labels readable on their actual light and dark surfaces', () => {
    for (const [text, surface] of [
      ['#45252e', '#fff7f5'], ['#765760', '#fffdfb'], ['#a04e5d', '#fffdfb'],
      ['#45252e', '#f1dfd8'], ['#45252e', '#f9ede7'], ['#fff9f2', '#723745'],
    ]) {
      expect(contrast(text, surface), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
