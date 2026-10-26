import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { inlineHomepageStyles, inlineHomepageFonts, selectHomepageThemeAssets } from '@/lib/amethyst/homepage-theme-assets'

const html = readFileSync('public/amethyst/Homepage.html', 'utf8')
describe('customer homepage delivery budget', () => {
  it('delivers approved Latin fonts and matching fallback metrics without external blocking CSS', async () => {
    const result = await inlineHomepageFonts(html, ['"Playfair Display", Georgia, serif', '"DM Sans", Arial, sans-serif'])
    expect(result).not.toMatch(/<link[^>]+href="https:\/\/(?:fonts\.googleapis|api\.fontshare)/)
    expect(result).toContain('data:font/woff2;base64,')
    expect(result).toContain('font-family:"playfair display fallback"')
    expect(result).toContain('size-adjust:111.26%')
    expect(result).toContain('font-family:"dm sans fallback"')
  })
  it('selects the smaller scene plate on phone without fetching an art master', async () => {
    const result = await inlineHomepageStyles(selectHomepageThemeAssets(html, 'fall_owl_harvest_moon'))
    expect(result).toContain('hero-poster-delivery-720.webp')
    expect(result).toContain('@media(max-width:600px)')
    expect(result).not.toContain("url('/amethyst/skins/fall-owl/hero-poster.webp')")
  })
  it('ships the selected scene and fonts without unrelated blocking skin assets', () => {
    const selected = selectHomepageThemeAssets(html, 'sunset_beach', undefined, ['"Playfair Display", Georgia, serif', '"DM Sans", system-ui'])
    expect(selected).toContain('sunset-beach.css')
    expect(selected).not.toContain('fall-owl.css')
    expect(selected).not.toContain('framed-hero.css')
    expect(selected).not.toMatch(/rel="stylesheet" href="https:\/\/api.fontshare/)
    expect(selected).toContain('family=Playfair+Display')
    expect(selected).toContain('family=DM+Sans')
    expect(selected).not.toContain('family=Archivo')
    expect(selected).toContain('media="(max-width: 600px)" href="/amethyst/skins/sunset-beach/hero-approved-720-v2.webp"')
    // Mobile media queries must see the real viewport before preloads start.
    expect(selected.indexOf('name="viewport"')).toBeLessThan(selected.indexOf('rel="preload"'))
  })
  it('retains custom-site styling and font delivery', () => {
    expect(selectHomepageThemeAssets(html, 'amethyst', 'bling_kitchen_hybrid')).toContain('framed-hero.css')
    expect(selectHomepageThemeAssets(html, 'amethyst', 'britt_with_bling_hybrid')).toContain('britt-hero-buttons.css')
    expect(selectHomepageThemeAssets(html, 'amethyst', 'bling_kitchen_hybrid')).toContain('api.fontshare.com/v2/css')
  })
  it('does not put the multi-megabyte art master on the visitor loading path', () => {
    expect(statSync('public/amethyst/skins/sunset-beach/hero-approved-1440.webp').size).toBeLessThan(300_000)
    expect(statSync('public/amethyst/skins/sunset-beach/hero-approved-720-v2.webp').size).toBeLessThan(75_000)
    expect(readFileSync('public/amethyst/sunset-beach.css', 'utf8')).not.toContain('hero-approved.png')
  })
  it('delivers selected repository styles in the first response without fetching external CSS on the server', async () => {
    const result = await inlineHomepageStyles(selectHomepageThemeAssets(html, 'sunset_beach'))
    expect(result).toContain('<style data-stylesheet="homepage.css">')
    expect(result).toContain('<style data-stylesheet="sunset-beach.css">')
    expect(result).not.toMatch(/<link rel="stylesheet" href="(?:\/amethyst\/)?homepage\.css/)
    expect(result).toContain('https://fonts.googleapis.com')
    expect(result).toContain('/amethyst/skins/sunset-beach/hero-approved-720-v2.webp')
    expect(result).not.toContain('<style data-stylesheet="fall-owl.css">')
  })
})
