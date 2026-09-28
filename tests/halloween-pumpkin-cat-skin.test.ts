import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getAmethystAppearancePreset, normalizeAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { GET } from '@/app/skin-preview/[skin]/[page]/route'

const id = 'halloween_pumpkin_cat'
describe('Pumpkin and Cat community skin', () => {
  it('recognizes selection by id, code and label and retains matching tokens on every page', () => {
    expect(normalizeAmethystAppearancePreset(id)).toBe(id)
    expect(normalizeAmethystSkinSelection('HPC-01')).toBe(id)
    expect(normalizeAmethystSkinSelection('Halloween Pumpkin and Cat')).toBe(id)
    expect(getCommunityAmethystSkinCards().find(c => c.id === id)).toMatchObject({ code: 'HPC-01', headingFont: 'Georgia', bodyFont: 'Arial' })
    const expected = { preset: id, primaryColor: '#ff923d', bgTreatment: 'halloween-pumpkin-cat', headingFont: 'georgia', bodyFont: 'arial' }
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData, id)).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData, id)).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData, id)).toMatchObject(expected)
    expect(getAmethystAppearancePreset(id).values.heroMotion).toBe('cat_candle')
  })
  it.each(['homepage','trade','join','unsubscribe'] as const)('renders a provider-free %s preview with the real runtime', async page => {
    const response = await GET(new Request(`https://www.yoursparklesuite.com/skin-preview/${id}/${page}`), {params:Promise.resolve({skin:id,page})})
    expect(response.status).toBe(200)
    const html=await response.text()
    expect(html).toContain('Halloween Pumpkin and Cat')
    expect(html).toContain('halloween-pumpkin-cat.css')
    expect(html).toContain('sandbox="allow-scripts"')
    expect(html).not.toContain('allow-same-origin')
  })
  it('preserves every legacy database preset and adds only a community catalog entry', () => {
    const sql=readFileSync('supabase/migrations/20260928000100_add_halloween_pumpkin_cat.sql','utf8')
    for(const legacy of ['pearl','luxe','ocean_sapphire','halloween_pumpkin_witch','neon_butterfly']) expect(sql).toContain(`'${legacy}'`)
    expect(sql).toContain("('halloween_pumpkin_cat', 'community', NULL, false)")
    expect(sql).not.toMatch(/UPDATE\s+public\.site_settings/i)
  })
})
