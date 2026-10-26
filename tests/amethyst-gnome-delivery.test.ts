import { readFileSync, statSync } from 'node:fs'
import { expect, it } from 'vitest'
import { selectHomepageThemeAssets } from '@/lib/amethyst/homepage-theme-assets'

it('serves correctly sized Gnome artwork on a 360px phone without changing desktop originals', () => {
  const root = 'public/amethyst/skins/gnome-garden/'
  expect(['forest-mobile-delivery-360.webp', 'gnome-delivery-96.webp', 'lantern-delivery-48.webp'].reduce((n,file)=>n+statSync(root+file).size,0)).toBeLessThan(20_000)
  const html = selectHomepageThemeAssets('<head><meta name="viewport" content="width=device-width"></head>', 'gnome_garden')
  expect(html).toContain('forest-mobile-delivery-360.webp 360w')
  expect(html).toContain('imagesizes="(max-width: 400px) 360px, 720px"')
  expect(html).toContain('forest-delivery-1440.webp')
  const source = readFileSync('public/amethyst/homepage.jsx','utf8')
  expect(source).toContain('sizes="(max-width: 767px) 82px, 180px"')
  expect(source).toContain('sizes="(max-width: 767px) 48px, 100px"')
})
