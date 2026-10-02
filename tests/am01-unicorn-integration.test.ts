import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getAmethystAppearancePreset, DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, getAmethystSkinDropdownLabel, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { buildSkinPreviewDocument, renderSkinPreview, skinPreviewMediaSource, type SkinPreviewSkin } from '@/lib/amethyst/skin-preview'

describe('existing AM-01 Chasing Unicorns integration', () => {
  it('uses the approved public name everywhere while keeping legacy selection names valid', async () => {
    const card=getCommunityAmethystSkinCards().find(card => card.id === 'amethyst')!
    expect(card.label).toBe('Chasing Unicorns (Amethyst)')
    expect(getAmethystSkinDropdownLabel(card)).toBe('Chasing Unicorns (Amethyst) (AM-01)')
    expect(getAmethystAppearancePreset('amethyst').label).toBe('Chasing Unicorns (Amethyst)')
    for(const selection of ['Amethyst','Chasing Unicorns','Chasing Unicorns (Amethyst)','AM-01']) expect(normalizeAmethystSkinSelection(selection)).toBe('amethyst')
    const preview=await renderSkinPreview('amethyst','homepage','https://www.yoursparklesuite.com')
    expect(preview.includes('Chasing Unicorns (Amethyst)')).toBe(true)
  })
  it('preserves its saved identity, Community availability, palette, typography and current default', () => {
    expect(normalizeAmethystSkinSelection('AM-01')).toBe('amethyst')
    expect(normalizeAmethystSkinSelection('Chasing Unicorns')).toBe('amethyst')
    expect(getCommunityAmethystSkinCards().find(card => card.id === 'amethyst')).toMatchObject({code:'AM-01',visibility:'community',previewHref:'/skin-preview/amethyst/homepage'})
    expect(getAmethystAppearancePreset('amethyst').values).toMatchObject({primaryColor:'#5C0EFF',accentColor:'#FF1AC2',bgTone:'lavender',headingFont:'italiana',bodyFont:'inter',cardSurface:'holographic'})
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
  })
  it('keeps the real hero content and actions and scopes the runtime to the selected skin', () => {
    const source=readFileSync('public/amethyst/homepage.jsx','utf8')
    expect(source).toContain('data-appearance-preset={t.preset}')
    expect(source).toContain('data-slot="hero headline"')
    expect(source).toContain('data-slot="hero sub"')
    expect(source).toContain('Browse the dance floor')
    expect(source).toContain('<RevealScreenshotTip />')
    const runtime=readFileSync('public/amethyst/am01-unicorn.js','utf8')
    expect(runtime).toContain('.hp-hero[data-appearance-preset="amethyst"]')
    expect(runtime).not.toContain('setInterval')
    expect(runtime).not.toContain('fetch(')
    expect(runtime).not.toContain('higgsfield')
  })
  it('serves a sample preview with hosted media while keeping sample writes disabled', async () => {
    const skin='amethyst' as SkinPreviewSkin
    expect(skinPreviewMediaSource(skin,'https://sparkle-suite-smoke.vercel.app')).toBe('https://sparkle-suite-smoke.vercel.app/amethyst/skins/am01-unicorn/')
    const document=await buildSkinPreviewDocument(skin,'homepage','https://sparkle-suite-smoke.vercel.app')
    expect((await renderSkinPreview(skin,'homepage','https://sparkle-suite-smoke.vercel.app')).includes('Chasing Unicorns')).toBe(true)
    expect(document).toContain('am01-unicorn.css')
    expect(document).toContain('Moonlit Magic')
    expect(document).toContain("connect-src 'none'")
    expect(document).toContain("form-action 'none'")
    expect(document).not.toContain('AMETHYST_SITE_CONTEXT')
  })
})
