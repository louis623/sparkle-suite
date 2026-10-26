import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { selectHomepageThemeAssets } from '@/lib/amethyst/homepage-theme-assets'

it.each(['neon_butterfly','gnome_garden','halloween_pumpkin_witch'])('%s preloads the rendition used by a narrow phone', preset => {
  const html = selectHomepageThemeAssets('<head><meta name="viewport" content="width=device-width"></head>',preset)
  expect(html).toContain('-delivery-360.webp 360w')
  expect(html).toContain('imagesizes="(max-width: 400px) 360px, 720px"')
})

it('keeps Gilded server and client poster sizing consistent', () => {
  const source=readFileSync('public/amethyst/homepage.jsx','utf8')
  expect(source).toContain('gilded-autumn/hero-poster-delivery-720.avif 720w')
  expect(source).toContain("sizes: '100vw'")
  expect(readFileSync('public/amethyst/hero-delivery.js','utf8')).toContain("'(max-width:400px) 360px, 100vw'")
})


it.each(['gilded_autumn','pearl_rose','midnight_rose','rose_champagne','fall_owl_harvest_moon','gobble_and_fizz','pie_please'])('%s preserves enough poster pixels to cover its later movie frame', preset => {
 const html=selectHomepageThemeAssets('<head><meta name="viewport" content="width=device-width"></head>',preset);
 expect(html).toMatch(/hero-poster(?:-v4)?-delivery-720\.avif/);
 expect(html).not.toContain('delivery-360');
});
