import heroImages from '../../public/amethyst/hero-delivery.json'
import fontManifest from '../../public/amethyst/fonts/manifest.json'
import fontFallbacks from '../../public/amethyst/fonts/fallbacks.json'
import criticalManifest from '../../public/amethyst/delivery/critical.json'
import stylesheetManifest from '../../public/amethyst/delivery/manifest.json'
import { homepagePaintGate } from './homepage-paint-gate'

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
  const posters: Record<string, [string, string?]> = {
    gilded_autumn: ['gilded-autumn/hero-poster.webp'], gobble_and_fizz: ['gobble-and-fizz/hero-poster.webp'],
    pie_please: ['pie-please/hero-poster-v4.webp'], pearl_rose: ['pearl-rose/hero-poster.webp'],
    fall_owl_harvest_moon: ['fall-owl/hero-poster.webp'], rose_champagne: ['rose-champagne/hero-poster.webp'],
    midnight_rose: ['midnight-rose/hero-poster.webp'],
    neon_butterfly: ['neon-butterfly/kelly-studio-desktop.webp', 'neon-butterfly/kelly-studio-mobile.webp'],
    gnome_garden: ['gnome-garden/forest.webp', 'gnome-garden/forest-mobile.webp'],
    halloween_pumpkin_witch: ['halloween-pumpkin-witch/hero-desktop.webp', 'halloween-pumpkin-witch/hero-mobile.webp'],
  }
  const imageMap = heroImages as Record<string, Record<string, {url:string}>>
  let desktopPoster = '', phonePoster = '', phoneResponsive = ''
  if (posters[preset]) {
    const [desktop, phone = desktop] = posters[preset]
    desktopPoster = imageMap['/amethyst/skins/' + desktop]['1440'].url
    phonePoster = imageMap['/amethyst/skins/' + phone]['720'].url
    const sizes = imageMap['/amethyst/skins/' + phone]
    if (sizes['360']) phoneResponsive = ` imagesrcset="${sizes['360'].url} 360w, ${sizes['720'].url} 720w, ${sizes['1440'].url} 1440w" imagesizes="(max-width: 400px) 360px, 720px"`
  }
  // The server video already paints its lightweight poster. Preload that exact
  // image instead of downloading a second full background underneath it.
  if (preset === 'sunset_beach') desktopPoster = phonePoster = '/amethyst/skins/sunset-beach/hero-poster-720.webp'
  if (preset === 'amethyst') desktopPoster = phonePoster = '/amethyst/skins/am01-unicorn/opening-poster.webp'
  if (desktopPoster) result = result.replace(/<meta name="viewport"[^>]+>/, viewport => viewport
    + '<link rel="preload" as="image" fetchpriority="high" media="(min-width: 601px)" href="' + desktopPoster + '">'
    + '<link rel="preload" as="image" fetchpriority="high" media="(max-width: 600px)" href="' + phonePoster + '"' + phoneResponsive + '>')
  // Pumpkin Cat's approved typography is entirely Georgia and Arial. Loading
  // every webfont here blocks its first paint without changing a single glyph.
  if (preset === 'halloween_pumpkin_cat') result = result.replace(/<link[^>]+href="https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, '')
  return result
}
// Inline the selected above-fold layout. Load complete cacheable styles without
// delaying its first paint; noscript retains the full accessible page.
export async function inlineHomepageStyles(html: string, preset?: string, heading?: {family:string;weight:number}, bodyClasses: string[] = [], variant?: string) {
  const manifest = stylesheetManifest as Record<string, string>
  const critical = criticalManifest as Record<string, {css:string;bodies:string[];presets:string[];variants:string[]}[]>
  let stylesheetCount = 0
  html = html.replace(/<link rel="stylesheet" href="(?:\/amethyst\/)?((?:bling-kitchen\/)?[a-z0-9-]+\.css)(?:\?[^\"]*)?"\s*\/>/g,
    (tag, name: string) => {
      if (!manifest[name]) return tag
      stylesheetCount++
      const css = (critical[name] ?? []).filter(rule => rule.bodies.every(c=>bodyClasses.includes(c)) && (!rule.presets.length || rule.presets.includes(preset ?? '')) && (!rule.variants.length || rule.variants.includes(variant ?? ''))).map(rule=>rule.css).join('')
      return '<style data-critical-stylesheet="' + name + '">' + css + '</style><link rel="stylesheet" href="' + manifest[name] + '" media="print" data-homepage-styles onload="sparkleHomepageStylesLoaded()" onerror="sparkleHomepageStylesLoaded()"><noscript><link rel="stylesheet" href="' + manifest[name] + '"></noscript>'
    })
  if (stylesheetCount) html = html.replace('<head>', '<head>' + homepagePaintGate + '<script>(function(){var remaining=' + stylesheetCount + ';window.sparkleHomepageStylesLoaded=function(){if(--remaining)return;function apply(){document.querySelectorAll("link[data-homepage-styles]").forEach(function(link){link.media="all"})}window.sparkleAfterHeroPaint(apply)}})();</script>')
  html = html.replace('</head>', '<style data-critical-homepage>html{background:var(--hp-bg,#100b1c)}body{margin:0;background:var(--hp-bg,#100b1c);color:var(--hp-text,#f7f4fc)}</style></head>')
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

/** Font binaries stay in hashed cacheable files; preload only selected Latin faces. */
export async function inlineHomepageFonts(html: string, stacks: string[], headingWeight = 600) {
  const families = [...new Set(stacks.map(stack => stack.split(',')[0].trim().replaceAll('"', '').toLowerCase()))]
  const manifest = fontManifest as Record<string, {css: string; file: string; inline: boolean}[]>
  type Fallback = {fallbackFont:string;ascentOverride:string;descentOverride:string;lineGapOverride:string;sizeAdjust:string;weight?:number}
  const fallbacks = fontFallbacks as Record<string, Fallback | Fallback[]>
  const selected = families.flatMap(family => manifest[family] ?? [])
  const faces = selected.map(face => face.css).join('\n')
  const hostedFaces = families.flatMap((family, index) => {
    const weight = index === 0 ? headingWeight : 400
    const candidates = (manifest[family] ?? []).filter(face => !face.file).map(face => ({face, weight: Number(face.css.match(/font-weight:\s*(\d+)/)?.[1])}))
    const selected = candidates.sort((a,b) => Math.abs(a.weight-weight)-Math.abs(b.weight-weight))[0]?.face
    return selected?.css.match(/https:\/\/cdn\.fontshare\.com\/[^'" )]+/)?.[0] ?? []
  })
  const preloadUrls = [...new Set([...selected.filter(face => face.inline).map(face => '/amethyst/fonts/' + face.file), ...hostedFaces])]
  const preloads = preloadUrls.map(url => '<link rel="preload" as="font" type="font/woff2" crossorigin href="' + url + '">').join('')
  // A custom site's fonts are not replaced unless every requested external
  // family is in the checked-in manifest. System fonts need no download.
  if (families.some(f => !manifest[f]?.length && !['georgia','arial','inter','system-ui'].includes(f))) return html
  const metrics = families.map(family => {
    const m = fallbacks[family]
    return m ? (Array.isArray(m) ? m : [m]).map(face => `@font-face{font-family:"${family} fallback";src:local("${face.fallbackFont}");${face.weight ? `font-weight:${face.weight};` : ''}size-adjust:${face.sizeAdjust};ascent-override:${face.ascentOverride};descent-override:${face.descentOverride};line-gap-override:${face.lineGapOverride}}`).join('') : ''
  }).join('')
  return html.replace(/<link[^>]+href="https:\/\/(?:api\.fontshare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"]*"[^>]*>/g, '')
    .replace('</head>', `${preloads}<style data-homepage-fonts>${faces}${metrics}</style></head>`)
}
