import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const THEME_ASSETS: Record<string, string[]> = {
  amethyst: ['am01-unicorn'], gnome_garden: ['gnome-garden'],
  neon_butterfly: ['neon-butterfly'], halloween_pumpkin_witch: ['halloween-pumpkin-witch'],
  halloween_pumpkin_cat: ['halloween-pumpkin-cat'], gilded_autumn: ['gilded-autumn'],
  midnight_rose: ['midnight-rose'], pearl_rose: ['pearl-rose'], rose_champagne: ['rose-champagne'],
  fall_owl_harvest_moon: ['fall-owl'], sunset_beach: ['sunset-beach'],
  gobble_and_fizz: ['gobble-and-fizz', 'thanksgiving-motion'], pie_please: ['pie-please', 'thanksgiving-motion'],
}
const themeFiles = new Set(Object.values(THEME_ASSETS).flat())

/** Keep the shared layout and selected theme; don't download every other skin. */
export function selectHomepageThemeAssets(html: string, preset: string, variant?: string, fontStacks: string[] = []) {
  const selected = new Set(THEME_ASSETS[preset] ?? [])
  let result = html.replace(/<link rel="stylesheet" href="(?:\/amethyst\/)?([a-z0-9-]+)\.css[^\"]*"\s*\/>/g,
    (tag, name: string) => themeFiles.has(name) && !selected.has(name) ? '' : tag)
  result = result.replace(/<script src="(?:\/amethyst\/)?([a-z0-9-]+)\.js[^\"]*"><\/script>/g,
    (tag, name: string) => themeFiles.has(name) && !selected.has(name) ? '' : tag)
  if (variant !== 'bling_kitchen_hybrid') result = result.replace(/<link[^>]+href="\/amethyst\/bling-kitchen\/framed-hero\.css[^"]*"[^>]*>/g, '')
  if (variant !== 'britt_with_bling_hybrid') result = result.replace(/<link[^>]+href="\/amethyst\/britt-hero-buttons\.css[^"]*"[^>]*>/g, '')
  if (!variant && fontStacks.length) {
    const fonts = new Set(fontStacks.flatMap(stack => stack.split(',').map(name => name.trim().replaceAll('"', '').toLowerCase())))
    result = result.replace(/<link rel="stylesheet" href="(https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com)[^"]+)"[^>]*>/g, (tag, href: string) => {
      const url = new URL(href.replaceAll('&amp;', '&'))
      const key = url.hostname === 'api.fontshare.com' ? 'f[]' : 'family'
      const families = url.searchParams.getAll(key).filter(value => fonts.has(value.split(/[:@]/)[0].replaceAll('-', ' ').toLowerCase()))
      if (!families.length) return ''
      url.searchParams.delete(key)
      for (const family of families) url.searchParams.append(key, family)
      return tag.replace(href, url.toString().replaceAll('&', '&amp;'))
    })
  }
  if (preset === 'sunset_beach') result = result.replace('</head>', '<link rel="preload" as="image" fetchpriority="high" media="(min-width: 601px)" href="/amethyst/skins/sunset-beach/hero-approved.webp"><link rel="preload" as="image" fetchpriority="high" media="(max-width: 600px)" href="/amethyst/skins/sunset-beach/hero-approved-720.webp"></head>')
  // Pumpkin Cat's approved typography is entirely Georgia and Arial. Loading
  // every webfont here blocks its first paint without changing a single glyph.
  if (preset === 'halloween_pumpkin_cat') result = result.replace(/<link[^>]+href="https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, '')
  return result
}
// Repository styles only, cached without rep data. Delivering the selected
// styles with the markup avoids another render-blocking network waterfall.
const styles = new Map<string, Promise<string>>()
export async function inlineHomepageStyles(html: string) {
  const matches = [...html.matchAll(/<link rel="stylesheet" href="(?:\/amethyst\/)?((?:bling-kitchen\/)?[a-z0-9-]+\.css)(?:\?[^\"]*)?"\s*\/>/g)]
  const replacements = await Promise.all(matches.map(async match => {
    const name = match[1]
    if (!styles.has(name)) styles.set(name, readFile(join(process.cwd(), 'public/amethyst', name), 'utf8'))
    return [match[0], `<style data-stylesheet="${name}">${(await styles.get(name))!.replace(/<\/style/gi, '<\\/style')}</style>`] as const
  }))
  for (const [link, style] of replacements) html = html.replace(link, () => style)
  return html
}
