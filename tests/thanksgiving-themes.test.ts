import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_AMETHYST_APPEARANCE_PRESET, normalizeAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { buildSkinPreviewDocument, skinPreviewMediaSource } from '@/lib/amethyst/skin-preview'

describe.each([
  { id: 'gobble_and_fizz', label: 'Gobble & Fizz', code: 'GF-01', slug: 'gobble-and-fizz', primary: '#efb36c', accent: '#c9854f', tone: 'gobbleAndFizz' },
  { id: 'pie_please', label: 'Pumpkin Pie', code: 'PP-01', slug: 'pie-please', primary: '#9b233d', accent: '#b95015', tone: 'piePlease' },
] as const)('$label Community theme', theme => {
  it('is selectable by stable id, label and code without changing existing selections or defaults', () => {
    for (const input of [theme.id, theme.label, theme.code]) expect(normalizeAmethystSkinSelection(input)).toBe(theme.id)
    expect(normalizeAmethystAppearancePreset(theme.id)).toBe(theme.id)
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
    expect(normalizeAmethystSkinSelection('FO-01')).toBe('fall_owl_harvest_moon')
    expect(getCommunityAmethystSkinCards().find(card => card.id === theme.id)).toMatchObject({ code: theme.code, visibility: 'community', label: theme.label, previewHref: `/skin-preview/${theme.id}/homepage` })
  })
  it('uses the same readable type and palette on every customer page', () => {
    const expected = { preset: theme.id, primaryColor: theme.primary, accentColor: theme.accent, bgTone: theme.tone, bgTreatment: theme.slug, cardSurface: theme.slug, headingFont: 'playfair', bodyFont: 'dmSans', headingWeight: 600, tickerSpeed: 1 }
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData, theme.id)).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData, theme.id)).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData, theme.id)).toMatchObject(expected)
  })
  it.each(['homepage', 'trade', 'join', 'unsubscribe'] as const)('offers the real %s renderer with safe sample guards', async page => {
    const origin = 'https://example.test'
    const doc = await buildSkinPreviewDocument(theme.id, page, origin)
    expect(doc).toContain(`${theme.slug}.css`)
    expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain("connect-src 'none'; form-action 'none'")
    expect(doc).toContain('Uploads are unavailable in this sample preview')
    expect(skinPreviewMediaSource(theme.id, origin)).toBe(`${origin}/amethyst/skins/${theme.slug}/`)
  })
  it('keeps shared navigation, ticker and lineup geometry locked', () => {
    const css = readFileSync(`public/amethyst/${theme.slug}.css`, 'utf8')
    expect(css).not.toMatch(/127\.0\.0\.1|localhost|animation:none!important/)
    for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/hp-header|hp-ticker|hp-lrq|hp-lineup/.test(selector)) expect(declarations).not.toMatch(/(?:^|;)\s*(?:position|display|margin|padding|gap|height|width|font|line-height|animation|transform|overflow)[\w-]*\s*:/)
    }
  })
})
