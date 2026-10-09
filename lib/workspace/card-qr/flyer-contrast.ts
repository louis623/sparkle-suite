export function hexToRgb(hex: string) {
  const value = hex.replace('#', '').trim()
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHex(red: number, green: number, blue: number) {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(red)}${channel(green)}${channel(blue)}`
}

export function mixHex(start: string, end: string, amount: number) {
  const from = hexToRgb(start)
  const to = hexToRgb(end)
  return rgbToHex(
    from.r + (to.r - from.r) * amount,
    from.g + (to.g - from.g) * amount,
    from.b + (to.b - from.b) * amount,
  )
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio. 4.5 is AA for normal text. 3 is AA for large text. */
export function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

export function readableColor(preferred: string, background: string, minimum: number) {
  if (contrastRatio(preferred, background) >= minimum) return preferred
  const target = relativeLuminance(background) > 0.4 ? '#14120f' : '#ffffff'
  for (let step = 1; step <= 24; step += 1) {
    const mixed = mixHex(preferred, target, step / 24)
    if (contrastRatio(mixed, background) >= minimum) return mixed
  }
  return target
}

export function readableOn(background: string, minimum = 4.5) {
  const light = '#ffffff'
  const dark = '#16130f'
  const lightRatio = contrastRatio(light, background)
  const darkRatio = contrastRatio(dark, background)
  if (lightRatio >= minimum || darkRatio >= minimum) {
    return lightRatio >= darkRatio ? light : dark
  }
  return lightRatio >= darkRatio ? light : dark
}

/**
 * Color the text is actually sitting on. Panels are slightly translucent,
 * so this mixes a little of the page into the panel fill.
 */
export function panelContrastBackground(panel: string, page: string, opacity = 0.92) {
  return mixHex(page, panel, opacity)
}
