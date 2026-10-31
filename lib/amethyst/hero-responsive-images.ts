import images from './generated/hero-images.json'

// These derivatives are SSR-owned; frozen CSS and original files remain intact.
// Keep gradients, crop positions and media queries exactly as authored.
export function responsiveHeroCss(css: string, pictureOwnsStill = false) {
  let variables = ''
  for (const [index, [original, image]] of Object.entries(images).entries()) {
    if (!css.includes(original)) continue
    if (pictureOwnsStill && original.endsWith('/sunset-beach/hero-approved.png')) {
      // Home's picture supplies this same frame and crop. A second CSS image
      // would duplicate its transfer; retain the authored gradient layers.
      css = css.replaceAll(`url('${original}')`, 'none').replaceAll(`url("${original}")`, 'none')
      continue
    }
    const name = `--ssr-hero-image-${index}`
    css = css.replaceAll(`url('${original}')`, `var(${name})`).replaceAll(`url("${original}")`, `var(${name})`)
    for (const [i, variant] of image.variants.entries()) {
      const value = `image-set(url("${variant.avif.src}") type("image/avif"),url("${variant.webp.src}") type("image/webp"))`
      const rule = `:root{${name}:${value}}`
      variables += i === 0 ? rule : `@media(min-width:${image.variants[i - 1].width + 1}px){${rule}}`
    }
  }
  return css + variables
}

export function heroImagePreload(markup: string, preset: string) {
  const image = images['/amethyst/skins/sunset-beach/hero-approved.png']
  if (preset !== 'sunset_beach' || !/class="(?:hp|jp)-hero-media/.test(markup)) return ''
  const srcset = image.variants.map(v => `${v.avif.src} ${v.width}w`).join(', ')
  // A type-aware preload avoids downloading both codecs on AVIF browsers.
  return `<link rel="preload" as="image" type="image/avif" href="${image.variants[1].avif.src}" imagesrcset="${srcset}" imagesizes="100vw" fetchpriority="high" data-ssr-hero-preload>`
}
