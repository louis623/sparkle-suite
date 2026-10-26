import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { selectHomepageThemeAssets } from '@/lib/amethyst/homepage-theme-assets'

it.each(['neon_butterfly','gilded_autumn','fall_owl_harvest_moon','pie_please','pearl_rose'])('%s preloads the rendition used by a narrow phone', preset => {
  const html = selectHomepageThemeAssets('<head><meta name="viewport" content="width=device-width"></head>',preset)
  expect(html).toContain('-delivery-360.webp 360w')
  expect(html).toContain('imagesizes="(max-width: 400px) 360px, 720px"')
})

it('keeps Gilded server and client poster sizing consistent', () => {
  const source=readFileSync('public/amethyst/homepage.jsx','utf8')
  expect(source).toContain('gilded-autumn/hero-poster-delivery-360.webp 360w')
  expect(source).toContain("sizes: '(max-width:400px) 360px, 100vw'")
  expect(readFileSync('public/amethyst/hero-delivery.js','utf8')).toContain("'(max-width:400px) 360px, 100vw'")
})

