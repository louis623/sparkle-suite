import fonts from './generated/utility-fonts.json'
import fontData from './generated/utility-font-data.json'

/** Pinned copies of the original page fonts, shared by every SSR surface.
 * Critical Latin faces are embedded, preloaded and decoded from the head so
 * their first layout does not depend on a provider stylesheet round trip. */
export function utilityPageFonts(properties: Map<string, string>, css: string, preset: string) {
  const families = Object.entries(fonts).filter(([family]) =>
    [properties.get('--hp-display-font'), properties.get('--hp-body-font'), css]
      .some(value => value?.includes(`"${family}"`) || value?.includes(`'${family}'`)),
  )
  const primary = [properties.get('--hp-display-font'), properties.get('--hp-body-font')]
    .map(value => value?.split(',')[0]?.replaceAll('"', '').trim())
  const rules: string[] = []
  const warmFonts = new Set<string>()
  const headingPreloads = new Set<string>()
  for (const [family, faces] of families) {
    // Variable faces often share the same bytes across several weight rules.
    // Merge only identical file/style/range groups so inline data occurs once.
    const groups = new Map<string, typeof faces>()
    for (const face of faces) {
      const key = face.src + face.style + (face.css.match(/unicode-range:[^;]+/)?.[0] ?? '')
      groups.set(key, [...(groups.get(key) ?? []), face])
    }
    for (const group of groups.values()) {
      const face = group[0]
      let rule = face.css
      const weights = group.map(face => Number(face.weight))
      if (group.length > 1 && weights.every(Number.isFinite)) {
        rule = rule.replace(/font-weight:[^;]+/, `font-weight: ${Math.min(...weights)} ${Math.max(...weights)}`)
      }
      const latin = !rule.includes('unicode-range') || rule.includes('U+0000-00FF')
      const critical = primary.includes(family) || family === 'Playfair Display' ||
        (preset === 'emerald_garden' && family === 'Cormorant Garamond')
      if (critical && latin) {
        const data = fontData[face.src as keyof typeof fontData]
        rule = rule.replace(face.src, data)
        warmFonts.add(`${face.style} ${face.weight} 16px ${JSON.stringify(family)}`)
        // Reuse the exact same embedded resource as @font-face: no duplicate
        // font download and no extra remote font stylesheet for the hero.
        if (family === primary[0] && face.style === 'normal') headingPreloads.add(data)
      }
      rules.push(rule)
    }
  }
  // Demand/decode embedded faces in the head, before body layout can use a
  // substitute font. This never hides the page or waits on a provider request.
  return [...headingPreloads].map(src => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${src}" data-ssr-heading-font>`).join('') + `<style data-ssr-fonts>${rules.join('\n')}</style><script>if(document.fonts){${JSON.stringify([...warmFonts])}.forEach(function(font){document.fonts.load(font).catch(function(){})})}</script>`
}
