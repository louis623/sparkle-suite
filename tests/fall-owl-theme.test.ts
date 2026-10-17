import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAmethystAppearancePreset, normalizeAmethystAppearancePreset, DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { buildSkinPreviewDocument, skinPreviewMediaSource } from '@/lib/amethyst/skin-preview'

describe('Fall Owl and Harvest Moon community theme', () => {
  it('is discoverable by every rep by id, name and code without changing existing selections or default', () => {
    for (const selection of ['fall_owl_harvest_moon', 'Fall Owl and Harvest Moon', 'FO-01']) expect(normalizeAmethystSkinSelection(selection)).toBe('fall_owl_harvest_moon')
    expect(normalizeAmethystAppearancePreset('fall_owl_harvest_moon')).toBe('fall_owl_harvest_moon')
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
    expect(normalizeAmethystSkinSelection('Midnight Rose')).toBe('midnight_rose')
    expect(getCommunityAmethystSkinCards().find(card => card.id === 'fall_owl_harvest_moon')).toMatchObject({code:'FO-01', visibility:'community', label:'Fall Owl and Harvest Moon', previewHref:'/skin-preview/fall_owl_harvest_moon/homepage'})
  })
  it('applies the approved palette and original Amethyst type across customer pages', () => {
    const expected={preset:'fall_owl_harvest_moon', primaryColor:'#efba73', accentColor:'#c7854f', bgTone:'fallOwl', bgTreatment:'fall-owl',cardSurface:'fall-owl',headingFont:'playfair',bodyFont:'dmSans',headingWeight:600,tickerSpeed:1}
    expect(getAmethystAppearancePreset('fall_owl_harvest_moon').label).toBe('Fall Owl and Harvest Moon')
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData,'fall_owl_harvest_moon')).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData,'fall_owl_harvest_moon')).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData,'fall_owl_harvest_moon')).toMatchObject(expected)
    for(const page of ['homepage','trade','join']) expect(readFileSync(`public/amethyst/${page}.jsx`,'utf8')).toContain('body.classList.add("bg-fall-owl")')
  })
  it.each(['homepage','trade','join','unsubscribe'] as const)('keeps the real %s sample sandbox and its guarded requests', async page => {
    const origin='https://www.yoursparklesuite.com'
    const doc=await buildSkinPreviewDocument('fall_owl_harvest_moon',page,origin)
    expect(doc).toContain('fall-owl.css')
    expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain("connect-src 'none'; form-action 'none'")
    expect(doc).toContain('Uploads are unavailable in this sample preview')
    expect(skinPreviewMediaSource('fall_owl_harvest_moon',origin)).toBe(origin+'/amethyst/skins/fall-owl/')
  })
  it('does not freeze shared tickers or use local preview assets in production', () => {
    const css=readFileSync('public/amethyst/fall-owl.css','utf8')
    expect(css).not.toMatch(/127\.0\.0\.1|localhost|animation:none!important/)
    for(const token of ['--hp-card-fg: #fff3e4','--hp-card-muted: #ddc8b8','--hp-media-placeholder-fg: #ddc8b8']) expect(css).toContain(token)
    for(const [,selector,declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if(/hp-header|hp-ticker|hp-lrq|hp-lineup/.test(selector)) expect(declarations).not.toMatch(/(?:^|;)\s*(?:position|display|margin|padding|gap|height|width|font|line-height|animation|transform|overflow)[\w-]*\s*:/)
  })
})
