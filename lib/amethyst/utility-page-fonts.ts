import fonts from './generated/utility-fonts.json'
import fontData from './generated/utility-font-data.json'

/** Pinned original fonts. Alpine Opal Trade embeds only its actual families,
 * once each, and starts their decoding before the shared stylesheet payload. */
export function utilityPageFonts(properties: Map<string, string>, css: string, preset: string, leanTrade = false) {
  const primary = [properties.get('--hp-display-font'), properties.get('--hp-body-font')]
    .map(value => value?.split(',')[0]?.replaceAll('"', '').trim())
  const families = Object.entries(fonts).filter(([family]) =>
    leanTrade ? primary.includes(family) || family === 'Playfair Display' :
    [properties.get('--hp-display-font'), properties.get('--hp-body-font'), css]
      .some(value => value?.includes(`"${family}"`) || value?.includes(`'${family}'`)),
  )
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
        if (!leanTrade && family === primary[0] && face.style === 'normal') headingPreloads.add(data)
      }
      rules.push(rule)
    }
  }
  return [...headingPreloads].map(src => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${src}" data-ssr-heading-font>`).join('') + `<style data-ssr-fonts>${rules.join('\n')}</style><script>if(document.fonts){(function(){
// A buffer-backed FontFace is decoded synchronously. Reuse the embedded bytes
// from CSSOM so WebKit cannot paint fallback metrics while a data-URL face loads.
// No extra payload, network request, render blocker or deferred motion startup.
var sheet=document.querySelector('style[data-ssr-fonts]').sheet;
if(typeof FontFace==='function')Array.from(sheet.cssRules).forEach(function(rule){
 var s=rule.style;if(!s)return;var match=s.getPropertyValue('src').match(/base64,([^\\)"']+)/);if(!match)return;
 try{var bytes=Uint8Array.from(atob(match[1]),function(c){return c.charCodeAt(0)});
 var face=new FontFace(s.getPropertyValue('font-family').replace(/["']/g,''),bytes,{style:s.getPropertyValue('font-style')||'normal',weight:s.getPropertyValue('font-weight')||'400',unicodeRange:s.getPropertyValue('unicode-range')||'U+0-10FFFF',display:'block'});if(face.status==='loaded'){document.fonts.add(face);sheet.deleteRule(Array.from(sheet.cssRules).indexOf(rule))}}catch(e){}
});})();${JSON.stringify([...warmFonts])}.forEach(function(font){document.fonts.load(font).catch(function(){})})}</script>`
}
