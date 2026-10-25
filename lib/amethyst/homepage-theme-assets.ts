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
  if (preset === 'sunset_beach') result = result.replace('</head>', '<link rel="preload" as="image" fetchpriority="high" href="/amethyst/skins/sunset-beach/hero-approved.webp"></head>')
  // Pumpkin Cat's approved typography is entirely Georgia and Arial. Loading
  // every webfont here blocks its first paint without changing a single glyph.
  if (preset === 'halloween_pumpkin_cat') result = result.replace(/<link[^>]+href="https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, '')
  return result
}
