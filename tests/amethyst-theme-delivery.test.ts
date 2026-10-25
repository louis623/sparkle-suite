import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { selectHomepageThemeAssets } from '@/lib/amethyst/homepage-theme-assets'

const html = readFileSync('public/amethyst/Homepage.html', 'utf8')
describe('customer homepage delivery budget', () => {
  it('ships the selected scene and fonts without unrelated blocking skin assets', () => {
    const selected = selectHomepageThemeAssets(html, 'sunset_beach', undefined, ['"Playfair Display", Georgia, serif', '"DM Sans", system-ui'])
    expect(selected).toContain('sunset-beach.css')
    expect(selected).not.toContain('fall-owl.css')
    expect(selected).not.toContain('framed-hero.css')
    expect(selected).not.toMatch(/rel="stylesheet" href="https:\/\/api.fontshare/)
    expect(selected).toContain('family=Playfair+Display')
    expect(selected).toContain('family=DM+Sans')
    expect(selected).not.toContain('family=Archivo')
    expect(selected).toContain('fetchpriority="high" href="/amethyst/skins/sunset-beach/hero-approved.webp"')
  })
  it('retains custom-site styling and font delivery', () => {
    expect(selectHomepageThemeAssets(html, 'amethyst', 'bling_kitchen_hybrid')).toContain('framed-hero.css')
    expect(selectHomepageThemeAssets(html, 'amethyst', 'britt_with_bling_hybrid')).toContain('britt-hero-buttons.css')
    expect(selectHomepageThemeAssets(html, 'amethyst', 'bling_kitchen_hybrid')).toContain('api.fontshare.com/v2/css')
  })
  it('does not put the multi-megabyte art master on the visitor loading path', () => {
    expect(statSync('public/amethyst/skins/sunset-beach/hero-approved.webp').size).toBeLessThan(300_000)
    expect(readFileSync('public/amethyst/sunset-beach.css', 'utf8')).not.toContain('hero-approved.png')
  })
})
