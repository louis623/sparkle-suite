import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { cardQrDesignThemeOptions, readCardQrDesignTheme } from '@/lib/workspace/card-qr/design-theme'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'

describe('Sunset Beach Community package', () => {
  it('recognizes the independent preset, public name and stable code', () => {
    for (const name of ['sunset_beach', 'Sunset Beach', 'SB-01']) expect(normalizeAmethystSkinSelection(name)).toBe('sunset_beach')
    expect(getCommunityAmethystSkinCards().find(c => c.id === 'sunset_beach')).toMatchObject({code:'SB-01',label:'Sunset Beach',visibility:'community'})
    expect(getAmethystAppearancePreset('rose_champagne').label).toBe('Rose Champagne')
  })
  it('carries the same approved colors through the unchanged page templates', () => {
    const preset = 'sunset_beach' as Parameters<typeof getAmethystAppearancePreset>[0]
    const expected = {preset:'sunset_beach',primaryColor:'#b82f59',accentColor:'#ad472d',headingFont:'playfair',bodyFont:'dmSans',tickerSpeed:1}
    expect(buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData,preset)).toMatchObject(expected)
    expect(buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData,preset)).toMatchObject(expected)
    expect(buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData,preset)).toMatchObject(expected)
  })
  it('offers real matching print art and the approved dark QR gradient', () => {
    expect(readCardQrDesignTheme('sunset_beach')).toBe('sunset_beach')
    expect(cardQrDesignThemeOptions('rose_champagne','rose-champagne').find(x=>x.id==='sunset_beach')).toMatchObject({label:'Sunset Beach',thumb:'/card-qr-themes/sunset-beach.webp'})
    expect(resolveCardQrPalette({templateId:'match-site',appearancePreset:'sunset_beach'}).qrGradient).toEqual(['#70213e','#8e2c4c','#853d22'])
  })
})

it('keeps the approved video and audio while using a smaller phone rendition', () => {
  const runtime = readFileSync('public/amethyst/sunset-beach.js', 'utf8')
  expect(runtime).toContain("matchMedia('(max-width:600px)').matches ? 'hero-loop-phone.mp4' : 'hero-loop.mp4'")
  expect(statSync('public/amethyst/skins/sunset-beach/hero-loop-phone.mp4').size).toBeLessThan(1_500_000)
  expect(runtime).toContain('video.muted = false')
})
