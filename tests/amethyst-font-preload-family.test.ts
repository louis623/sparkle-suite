import { expect, it } from 'vitest'
import manifest from '../public/amethyst/fonts/manifest.json'
import { inlineHomepageFonts } from '@/lib/amethyst/homepage-theme-assets'

it('preloads the actual Boska heading face rather than a companion Switzer face', async () => {
  const html = await inlineHomepageFonts('<head></head>', ['"Boska", serif', '"Switzer", sans-serif'], 600)
  const boska700 = manifest.boska.find(face => /font-family:\s*'Boska'/.test(face.css) && /font-weight:\s*700/.test(face.css))!
  const expected = boska700.css.match(/https:\/\/cdn\.fontshare\.com\/[^'" )]+/)![0]
  const preloads = [...html.matchAll(/<link rel="preload"[^>]+href="([^"]+)"/g)].map(m=>m[1])
  expect(preloads[0]).toBe(expected)
  expect(preloads).toHaveLength(2)
  expect(html).not.toContain("font-family: 'Gambetta'")
  expect(html.match(/font-family:\s*'Switzer'/g)).toHaveLength(manifest.switzer.filter(face=>/font-family:\s*'Switzer'/.test(face.css)).length)
})

it('matches a 600 Sharpie request to its available 700 face', async () => {
  const html = await inlineHomepageFonts('<head></head>', ['"Sharpie", serif', '"Ranade", sans-serif'], 600)
  const expected=manifest.sharpie.find(face=>/font-family:\s*'Sharpie'/.test(face.css)&&/font-weight:\s*700/.test(face.css))!.css.match(/https:\/\/cdn\.fontshare\.com\/[^'" )]+/)![0]
  expect(html.match(/<link rel="preload"[^>]+href="([^"]+)"/)![1]).toBe(expected)
})

it('keeps metric-adjusted fallbacks available when Windows fonts are absent', async () => {
  const html = await inlineHomepageFonts('<head></head>', ['"Playfair Display", serif', '"DM Sans", sans-serif'], 600)
  expect(html).toContain('src:local("Times New Roman"),local("Liberation Serif"),local("Tinos")')
  expect(html).toContain('src:local("Arial"),local("Liberation Sans"),local("Arimo")')
  expect(html).toMatch(/font-family:"playfair display fallback";src:[^;]+;size-adjust:111\.26%;ascent-override:97\.25%/)
})
