import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import fontManifest from '../../public/amethyst/fonts/manifest.json'
import fontFallbacks from '../../public/amethyst/fonts/fallbacks.json'
import heroImages from '../../public/amethyst/hero-delivery.json'

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
  if (preset === 'sunset_beach') result = result.replace(/<meta name="viewport"[^>]+>/, viewport => viewport + '<link rel="preload" as="image" fetchpriority="high" media="(min-width: 601px)" href="/amethyst/skins/sunset-beach/hero-approved-1440.webp"><link rel="preload" as="image" fetchpriority="high" media="(max-width: 600px)" href="/amethyst/skins/sunset-beach/hero-approved-720-v2.webp">')
  // Pumpkin Cat's approved typography is entirely Georgia and Arial. Loading
  // every webfont here blocks its first paint without changing a single glyph.
  if (preset === 'halloween_pumpkin_cat') result = result.replace(/<link[^>]+href="https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, '')
  return result
}
// Repository styles only, cached without rep data. Delivering the selected
// styles with the markup avoids another render-blocking network waterfall.
const styles = new Map<string, Promise<string>>()
export async function inlineHomepageStyles(html: string, preset?: string, heading?: {family:string;weight:number}) {
  const matches = [...html.matchAll(/<link rel="stylesheet" href="(?:\/amethyst\/)?((?:bling-kitchen\/)?[a-z0-9-]+\.css)(?:\?[^\"]*)?"\s*\/>/g)]
  const replacements = await Promise.all(matches.map(async match => {
    const name = match[1]
    if (!styles.has(name)) styles.set(name, readFile(join(process.cwd(), 'public/amethyst', name), 'utf8'))
    let css = (await styles.get(name))!
    let desktop = '', phone = ''
    for (const [index, [source, sizes]] of Object.entries(heroImages).entries()) {
      const pattern = new RegExp(`url\\(['"]?${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?[^)'" ]*)?['"]?\\)`, 'g')
      if (!pattern.test(css)) continue
      pattern.lastIndex = 0
      const variable = `--ss-hero-image-${index}`
      css = css.replace(pattern, `var(${variable})`)
      desktop += `${variable}:url('${sizes['1440'].url}');`
      phone += `${variable}:url('${sizes['720'].url}');`
    }
    css += `:root{${desktop}}@media(max-width:600px){:root{${phone}}}`
    return [match[0], `<style data-stylesheet="${name}">${css.replace(/<\/style/gi, '<\\/style')}</style>`] as const
  }))
  for (const [link, style] of replacements) html = html.replace(link, () => style)
  // These two phone heroes already have a 620px minimum scene. Reserve that
  // same space in the inner grid so late button-font wrapping cannot recenter
  // the entire headline. Their settled layout keeps its existing dimensions.
  if (preset === 'garnet' || preset === 'amber') html = html.replace('</head>', `<style data-hero-space>@media(max-width:640px){.hp-hero[data-appearance-preset="${preset}"]>.hp-hero-inner{min-height:inherit}}</style></head>`)
  if (['garnet', 'amber', 'rose_quartz'].includes(preset ?? '') && heading) {
    const metrics = (fontFallbacks as Record<string, unknown>)[heading.family]
    const face = Array.isArray(metrics) ? metrics.find(m => m.weight === heading.weight) : null
    // Preserve the approved final 11ch width without letting fallback glyph 0
    // change that width while the display face loads.
    if (face?.zeroEm) html = html.replace('</head>', `<style data-hero-heading-space>@media(max-width:640px){.hp-hero[data-appearance-preset="${preset}"] .hp-hero-headline{max-width:${(face.zeroEm * 11).toFixed(5)}em}}</style></head>`)
  }
  return html
}

const fontFiles = new Map<string, Promise<string>>()
/** Embed only the two selected Latin faces. Text and its final metrics arrive
 * together, avoiding the stylesheet -> font waterfall and late font swaps.
 * Other character subsets remain self-hosted and load only when needed. */
export async function inlineHomepageFonts(html: string, stacks: string[]) {
  const families = [...new Set(stacks.map(stack => stack.split(',')[0].trim().replaceAll('"', '').toLowerCase()))]
  const manifest = fontManifest as Record<string, {css: string; file: string; inline: boolean}[]>
  type Fallback = {fallbackFont:string;ascentOverride:string;descentOverride:string;lineGapOverride:string;sizeAdjust:string;weight?:number}
  const fallbacks = fontFallbacks as Record<string, Fallback | Fallback[]>
  const faces = (await Promise.all(families.flatMap(family => (manifest[family] ?? []).map(async face => {
    if (!face.inline) return face.css
    if (!fontFiles.has(face.file)) fontFiles.set(face.file, readFile(join(process.cwd(), 'public/amethyst/fonts', face.file)).then(bytes => bytes.toString('base64')))
    return face.css.replace(/url\([^)]*\)/, `url(data:font/woff2;base64,${await fontFiles.get(face.file)})`)
  })))).join('\n')
  // A custom site's fonts are not replaced unless every requested external
  // family is in the checked-in manifest. System fonts need no download.
  if (families.some(f => !manifest[f]?.length && !['georgia','arial','inter','system-ui'].includes(f))) return html
  const metrics = families.map(family => {
    const m = fallbacks[family]
    return m ? (Array.isArray(m) ? m : [m]).map(face => `@font-face{font-family:"${family} fallback";src:local("${face.fallbackFont}");${face.weight ? `font-weight:${face.weight};` : ''}size-adjust:${face.sizeAdjust};ascent-override:${face.ascentOverride};descent-override:${face.descentOverride};line-gap-override:${face.lineGapOverride}}`).join('') : ''
  }).join('')
  return html.replace(/<link[^>]+href="https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, '')
    .replace('</head>', `<style data-homepage-fonts>${faces}${metrics}</style></head>`)
}
