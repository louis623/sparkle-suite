import { existsSync, readFileSync } from 'node:fs'
import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js'
import QRCode from 'qrcode'
import sharp from 'sharp'
import {
  AMETHYST_APPEARANCE_PRESETS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import {
  FLYER_FALLBACK_FONT,
  FLYER_FONT_FACES,
  FLYER_THEME_FONTS,
  flyerFontFile,
  flyerFontFilesForTheme,
  type FlyerFontFamily,
} from '@/lib/workspace/card-qr/flyer-fonts'
import { measureTextWidth, retainCoveredGlyphs } from '@/lib/workspace/card-qr/glyphs'
import {
  CARD_QR_FLYER_HEIGHT,
  CARD_QR_FLYER_QR_SIZE,
  CARD_QR_FLYER_WIDTH,
  FLYER_SAFE_BOTTOM,
  FLYER_SAFE_TOP,
  FLYER_SCAN_LABEL,
  flyerPanelKind,
  layoutCardQrFlyer,
  type FlyerBox,
  type FlyerLayout,
  type FlyerTextBlock,
  type FlyerTextRole,
} from '@/lib/workspace/card-qr/flyer-layout'
import {
  contrastRatio,
  mixHex,
  panelContrastBackground,
  readableColor,
  readableOn,
  relativeLuminance,
} from '@/lib/workspace/card-qr/flyer-contrast'
import { flyerPlateAbsolute } from '@/lib/workspace/card-qr/flyer-themes'
import type { CardQrPalette } from '@/lib/workspace/card-qr/palette'
import { CARD_QR_PRINT_SPEC } from '@/lib/workspace/card-qr/pricing'

export {
  CARD_QR_FLYER_HEIGHT,
  CARD_QR_FLYER_QR_SIZE,
  CARD_QR_FLYER_WIDTH,
  FLYER_SAFE_BOTTOM,
  FLYER_SAFE_TOP,
}
export const CARD_QR_FLYER_SAFE_TOP = FLYER_SAFE_TOP
export const CARD_QR_FLYER_SAFE_BOTTOM = FLYER_SAFE_BOTTOM
export const CARD_QR_DARK = '#111111'
export const CARD_QR_LIGHT = '#FFFFFF'
export const CARD_QR_ERROR_CORRECTION = 'H' as const
export const CARD_QR_MARGIN = 4

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Text is drawn from bundled files. System fonts are never loaded. */
export function flyerTextRenderOptions(fontFiles: string[]): ResvgRenderOptions {
  return {
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: FLYER_FONT_FACES[FLYER_FALLBACK_FONT].family,
      serifFamily: FLYER_FONT_FACES[FLYER_FALLBACK_FONT].family,
      sansSerifFamily: FLYER_FONT_FACES[FLYER_FALLBACK_FONT].family,
    },
    fitTo: {
      mode: 'width',
      value: CARD_QR_FLYER_WIDTH,
    },
    textRendering: 1,
    shapeRendering: 2,
  }
}

export async function renderCardQrPng(
  url: string,
  _palette?: Pick<CardQrPalette, 'qrDark' | 'qrLight'> | null,
  width = 640,
) {
  return QRCode.toBuffer(url, {
    type: 'png',
    width,
    margin: CARD_QR_MARGIN,
    errorCorrectionLevel: CARD_QR_ERROR_CORRECTION,
    color: {
      dark: CARD_QR_DARK,
      light: CARD_QR_LIGHT,
    },
  })
}

export interface CardQrFlyerRenderInput {
  palette: CardQrPalette
  destinationUrl: string
  showQr: boolean
  appearancePreset: AmethystAppearancePresetId
  showTitle: string
  tagline?: string | null
  firstName?: string | null
  website?: string | null
}

export interface CardQrFlyerRenderParts {
  background: Buffer
  flyer: Buffer
  layout: FlyerLayout
}

function covered(text: string, family: FlyerFontFamily) {
  return retainCoveredGlyphs(text, flyerFontFile(family), flyerFontFile(FLYER_FALLBACK_FONT))
}

function svgText(input: {
  value: string
  y: number
  family: FlyerFontFamily
  size: number
  fill: string
  weight: number
  opacity?: number
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  letterSpacing?: number
  x?: number
}) {
  const familyName = FLYER_FONT_FACES[input.family].family
  const opacity = input.opacity == null ? '' : ` fill-opacity="${input.opacity}"`
  const stroke = input.stroke
    ? ` stroke="${input.stroke}" stroke-width="${input.strokeWidth ?? 6}" stroke-linejoin="round" stroke-opacity="${input.strokeOpacity ?? 1}"`
    : ''
  const spacing = input.letterSpacing == null ? '' : ` letter-spacing="${input.letterSpacing}"`
  const x = input.x ?? 540
  return `<text x="${x}" y="${input.y}" text-anchor="middle" dominant-baseline="hanging" font-family="${escapeXml(familyName)}" font-weight="${input.weight}" font-size="${input.size}" fill="${input.fill}"${opacity}${stroke}${spacing}>${escapeXml(input.value)}</text>`
}

function svgBlock(
  block: FlyerTextBlock | null,
  family: FlyerFontFamily,
  fill: string,
  weight: number,
) {
  if (!block) return ''
  return block.lines
    .map((line, index) =>
      svgText({
        value: line,
        y: block.top + index * block.lineHeight,
        family,
        size: block.size,
        fill,
        weight,
      }),
    )
    .join('')
}

export interface FlyerPaint {
  panelFill: string
  panelOpacity: number
  contrastPanel: string
  frame: string
  title: string
  body: string
  muted: string
  pillFill: string
  pillInk: string
  glow: string
  shadow: string
  radius: number
}

/** High enough that plate art does not tint the type. Art stays outside the panels. */
export const FLYER_PANEL_OPACITY = 0.96

function themePanelFill(palette: CardQrPalette, kind: ReturnType<typeof flyerPanelKind>) {
  const dark = relativeLuminance(palette.background) < 0.4
  if (dark) {
    const deep = mixHex(palette.panel, '#09070c', 0.4)
    return mixHex(deep, palette.background, 0.2)
  }
  const cream = kind === 'parchment' ? '#fff3e2' : '#fffdfb'
  return mixHex(cream, palette.accent, kind === 'parchment' ? 0.1 : 0.07)
}

export function resolveFlyerPaint(input: {
  palette: CardQrPalette
  appearancePreset: AmethystAppearancePresetId
}): FlyerPaint {
  const preset = AMETHYST_APPEARANCE_PRESETS[input.appearancePreset]
  const kind = flyerPanelKind(input.appearancePreset)
  const panelFill = themePanelFill(input.palette, kind)
  const panelOpacity = FLYER_PANEL_OPACITY
  const contrastPanel = panelContrastBackground(panelFill, input.palette.background, panelOpacity)
  const primary = preset.values.primaryColor
  const accent = preset.values.accentColor
  const candidates = [primary, accent, mixHex(primary, '#ffffff', 0.28), mixHex(accent, '#ffffff', 0.4)]
  let frame = primary
  let best = 0
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, input.palette.background)
    if (ratio > best) {
      frame = candidate
      best = ratio
    }
  }
  const title = readableColor(input.palette.ink, contrastPanel, 4.5)
  return {
    panelFill,
    panelOpacity,
    contrastPanel,
    frame,
    title,
    body: readableColor(input.palette.ink, contrastPanel, 4.5),
    muted: readableColor(input.palette.muted, contrastPanel, 4.5),
    pillFill: primary,
    pillInk: readableOn(primary, 4.5),
    glow: accent,
    shadow: relativeLuminance(title) > 0.5 ? '#000000' : '#ffffff',
    radius: kind === 'parchment' ? 22 : 32,
  }
}

function themeRand(theme: string) {
  let seed = 2166136261
  for (const char of theme) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619)
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function canvasSvg(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
}

function starPoint(x: number, y: number, size: number, color: string, opacity: number, spin = 0) {
  const long = size
  const short = Math.max(0.6, size * 0.16)
  return `<g transform="translate(${x},${y}) rotate(${spin})" fill="${color}" fill-opacity="${opacity.toFixed(2)}">
    <polygon points="0,${-long} ${short},${-short} ${long},0 ${short},${short} 0,${long} ${-short},${short} ${-long},0 ${-short},${-short}"/>
  </g>`
}

async function renderThemeBackground(input: {
  palette: CardQrPalette
  appearancePreset: AmethystAppearancePresetId
  layout: FlyerLayout
}) {
  const preset = AMETHYST_APPEARANCE_PRESETS[input.appearancePreset]
  const primary = preset.values.primaryColor
  const accent = preset.values.accentColor
  const ground = input.palette.background
  const dark = relativeLuminance(ground) < 0.4
  const deep = dark ? mixHex(ground, '#050308', 0.62) : mixHex(primary, ground, 0.58)
  const lift = dark ? mixHex(ground, primary, 0.42) : mixHex(ground, '#ffffff', 0.62)
  const mid = mixHex(ground, accent, dark ? 0.34 : 0.2)
  const silk = mixHex(lift, '#ffffff', dark ? 0.18 : 0.35)
  const glowY = input.layout.qr.y + input.layout.qr.height / 2
  const rand = themeRand(input.appearancePreset)
  const groundSvg = canvasSvg(`
    <defs>
      <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${lift}"/>
        <stop offset="0.38" stop-color="${ground}"/>
        <stop offset="0.7" stop-color="${mid}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="0.42" stop-color="${silk}" stop-opacity="${dark ? 0.16 : 0.28}"/>
        <stop offset="0.58" stop-color="#ffffff" stop-opacity="${dark ? 0.1 : 0.2}"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#ground)"/>
    <polygon points="0,180 1080,0 1080,520 0,860" fill="url(#sheen)"/>
    <polygon points="80,0 420,0 160,1920 0,1920" fill="${mixHex(primary, '#ffffff', 0.4)}" fill-opacity="0.05"/>
    <polygon points="700,0 1080,240 1080,1920 520,1920" fill="${accent}" fill-opacity="0.05"/>
  `)
  const orbs = (count: number, minR: number, maxR: number, opacity: number) => {
    const shapes: string[] = []
    for (let index = 0; index < count; index += 1) {
      const x = Math.round(rand() * CARD_QR_FLYER_WIDTH)
      const y = Math.round(rand() * CARD_QR_FLYER_HEIGHT)
      const radius = Math.round(minR + rand() * (maxR - minR))
      const color = index % 3 === 0 ? '#ffffff' : index % 3 === 1 ? accent : primary
      shapes.push(
        `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity="${(opacity * (0.65 + rand() * 0.5)).toFixed(2)}"/>`,
      )
    }
    return canvasSvg(shapes.join(''))
  }
  const rays = canvasSvg(`
    <g opacity="${dark ? 0.55 : 0.4}">
      <polygon points="540,${glowY - 80} 470,0 610,0" fill="${mixHex(accent, '#ffffff', 0.45)}" fill-opacity="0.35"/>
      <polygon points="180,${glowY} 0,220 0,520" fill="${primary}" fill-opacity="0.28"/>
      <polygon points="900,${glowY + 40} 1080,1480 1080,1760" fill="${accent}" fill-opacity="0.3"/>
    </g>
  `)
  const glitter: string[] = []
  for (let index = 0; index < 220; index += 1) {
    const x = Math.round(rand() * CARD_QR_FLYER_WIDTH)
    const y = Math.round(rand() * CARD_QR_FLYER_HEIGHT)
    const dust = rand()
    if (dust < 0.72) {
      glitter.push(
        `<circle cx="${x}" cy="${y}" r="${(0.4 + rand() * 1.5).toFixed(2)}" fill="#ffffff" fill-opacity="${(0.25 + rand() * 0.7).toFixed(2)}"/>`,
      )
    } else {
      const size = dust < 0.9 ? 3 + rand() * 5 : 8 + rand() * 10
      const color = index % 4 === 0 ? accent : '#ffffff'
      glitter.push(starPoint(x, y, size, color, 0.35 + rand() * 0.55, Math.round(rand() * 40)))
    }
  }
  const qrGlow = canvasSvg(`
    <defs>
      <radialGradient id="bloom" cx="540" cy="${glowY}" r="420" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${mixHex(accent, '#ffffff', 0.35)}" stop-opacity="0.85"/>
        <stop offset="0.45" stop-color="${primary}" stop-opacity="0.4"/>
        <stop offset="1" stop-color="${primary}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="540" cy="${glowY}" rx="430" ry="390" fill="url(#bloom)"/>
  `)
  const blurLayer = async (svg: string, sigma: number) =>
    sharp(renderSvgPng(svg, [])).blur(sigma).png().toBuffer()
  const base = renderSvgPng(groundSvg, [])
  return sharp(base)
    .composite([
      { input: await blurLayer(orbs(9, 90, 220, dark ? 0.55 : 0.42), 26), left: 0, top: 0 },
      { input: await blurLayer(orbs(16, 28, 70, dark ? 0.5 : 0.38), 10), left: 0, top: 0 },
      { input: await blurLayer(orbs(22, 8, 22, 0.45), 3), left: 0, top: 0 },
      { input: await blurLayer(rays, 12), left: 0, top: 0 },
      { input: renderSvgPng(qrGlow, []), left: 0, top: 0, blend: 'screen' },
      { input: renderSvgPng(canvasSvg(glitter.join('')), []), left: 0, top: 0 },
    ])
    .png()
    .toBuffer()
}

function centerScrimSvg(layout: FlyerLayout) {
  const glowY = layout.qr.y + layout.qr.height / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="scrim" cx="540" cy="${glowY}" r="430" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000000" stop-opacity="0.22"/>
      <stop offset="0.72" stop-color="#000000" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#scrim)"/>
</svg>`
}

function cornerFlourishes(box: FlyerBox, color: string) {
  const inset = 18
  const points = [
    [box.x + inset, box.y + inset],
    [box.x + box.width - inset, box.y + inset],
    [box.x + inset, box.y + box.height - inset],
    [box.x + box.width - inset, box.y + box.height - inset],
  ]
  return points
    .map(
      ([x, y]) =>
        `<g transform="translate(${x},${y}) rotate(45)"><rect x="-5" y="-5" width="10" height="10" fill="${color}" fill-opacity="0.9"/></g>`,
    )
    .join('')
}

function panelMarkup(box: FlyerLayout['panel'], paint: FlyerPaint) {
  if (!box) return ''
  const metal = mixHex(paint.frame, '#ffffff', 0.42)
  return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${paint.radius}" fill="${paint.panelFill}" fill-opacity="${paint.panelOpacity}" stroke="${metal}" stroke-width="2.4"/>
    <rect x="${box.x + 6}" y="${box.y + 6}" width="${box.width - 12}" height="${box.height - 12}" rx="${Math.max(12, paint.radius - 6)}" fill="none" stroke="${paint.frame}" stroke-width="1.3" stroke-opacity="0.9"/>
    <rect x="${box.x + 12}" y="${box.y + 12}" width="${box.width - 24}" height="${box.height - 24}" rx="${Math.max(8, paint.radius - 10)}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.38"/>
    ${cornerFlourishes(box, metal)}`
}

function dividerMarkup(y: number, color: string) {
  return `<line x1="230" y1="${y}" x2="508" y2="${y}" stroke="${color}" stroke-width="1.6" stroke-opacity="0.75"/>
    <line x1="572" y1="${y}" x2="850" y2="${y}" stroke="${color}" stroke-width="1.6" stroke-opacity="0.75"/>
    <g transform="translate(540,${y}) rotate(45)"><rect x="-6" y="-6" width="12" height="12" fill="${color}"/></g>`
}

function titleMarkup(block: FlyerTextBlock | null, family: FlyerFontFamily, paint: FlyerPaint) {
  if (!block) return ''
  return block.lines
    .map((line, index) => {
      const y = block.top + index * block.lineHeight
      return [
        svgText({
          value: line,
          y: y + 4,
          family,
          size: block.size,
          fill: paint.shadow,
          weight: 700,
          opacity: 0.38,
        }),
        svgText({
          value: line,
          y,
          family,
          size: block.size,
          fill: 'none',
          weight: 700,
          stroke: paint.glow,
          strokeWidth: Math.max(10, Math.round(block.size * 0.07)),
          strokeOpacity: 0.28,
        }),
        svgText({
          value: line,
          y,
          family,
          size: block.size,
          fill: paint.title,
          weight: 700,
        }),
      ].join('')
    })
    .join('')
}

function foregroundSvg(input: {
  palette: CardQrPalette
  appearancePreset: AmethystAppearancePresetId
  layout: FlyerLayout
  showQr: boolean
}) {
  const fonts = FLYER_THEME_FONTS[input.appearancePreset]
  const paint = resolveFlyerPaint(input)
  const { pill, qr, qrFrame, panel, lowerPanel } = input.layout
  const pillTextY = pill.y + (pill.height - input.layout.pillSize) / 2
  const titleGap = panel ? pill.y - (panel.y + panel.height) : 0
  const lowerGap = lowerPanel.y - (qrFrame.y + qrFrame.height)
  const dividers = [
    panel && titleGap >= 16
      ? dividerMarkup(Math.round(panel.y + panel.height + titleGap / 2), paint.frame)
      : '',
    lowerGap >= 16
      ? dividerMarkup(Math.round(qrFrame.y + qrFrame.height + lowerGap / 2), paint.frame)
      : '',
  ].join('')
  const glow = 18
  const pillShine = mixHex(paint.pillFill, '#ffffff', 0.55)
  const pillDeep = mixHex(paint.pillFill, '#14080c', 0.28)
  const sparkleY = pill.y + pill.height / 2
  const pillMarkup = `<defs>
      <linearGradient id="pillFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${pillShine}"/>
        <stop offset="0.42" stop-color="${paint.pillFill}"/>
        <stop offset="1" stop-color="${pillDeep}"/>
      </linearGradient>
    </defs>
    <rect x="${pill.x}" y="${pill.y}" width="${pill.width}" height="${pill.height}" rx="39" fill="url(#pillFill)"/>
    <ellipse cx="${pill.x + pill.width / 2}" cy="${pill.y + 16}" rx="${pill.width * 0.36}" ry="10" fill="#ffffff" fill-opacity="0.28"/>
    ${starPoint(pill.x + 28, sparkleY, 7, paint.pillInk, 0.95)}
    ${starPoint(pill.x + pill.width - 28, sparkleY, 7, paint.pillInk, 0.95)}
    ${svgText({
      value: FLYER_SCAN_LABEL,
      y: pillTextY,
      family: fonts.body,
      size: input.layout.pillSize,
      fill: paint.pillInk,
      weight: 700,
      letterSpacing: 2.6,
    })}`
  const corners = [
    [qrFrame.x + 14, qrFrame.y + 14],
    [qrFrame.x + qrFrame.width - 14, qrFrame.y + 14],
    [qrFrame.x + 14, qrFrame.y + qrFrame.height - 14],
    [qrFrame.x + qrFrame.width - 14, qrFrame.y + qrFrame.height - 14],
  ]
    .map(
      ([x, y]) =>
        `<g transform="translate(${x},${y}) rotate(45)"><rect x="-5" y="-5" width="10" height="10" fill="${paint.glow}"/></g>`,
    )
    .join('')
  const qrMarkup = input.showQr
    ? `<rect x="${qrFrame.x - glow}" y="${qrFrame.y - glow}" width="${qrFrame.width + glow * 2}" height="${qrFrame.height + glow * 2}" rx="40" fill="${paint.glow}" fill-opacity="0.42"/>
       <rect x="${qrFrame.x}" y="${qrFrame.y}" width="${qrFrame.width}" height="${qrFrame.height}" rx="30" fill="${paint.panelFill}" fill-opacity="${paint.panelOpacity}"/>
       <rect x="${qrFrame.x}" y="${qrFrame.y}" width="${qrFrame.width}" height="${qrFrame.height}" rx="30" fill="none" stroke="${paint.frame}" stroke-width="7"/>
       <rect x="${qrFrame.x + 8}" y="${qrFrame.y + 8}" width="${qrFrame.width - 16}" height="${qrFrame.height - 16}" rx="24" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.7"/>
       <rect x="${qr.x}" y="${qr.y}" width="${qr.width}" height="${qr.height}" rx="8" fill="${CARD_QR_LIGHT}" fill-opacity="1"/>
       ${corners}`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${panelMarkup(panel, paint)}
  ${panelMarkup(lowerPanel, paint)}
  ${dividers}
  ${titleMarkup(input.layout.showTitle, fonts.heading, paint)}
  ${svgBlock(input.layout.tagline, fonts.body, paint.body, 500)}
  ${pillMarkup}
  ${qrMarkup}
  ${svgBlock(input.layout.instructions, fonts.body, paint.body, 500)}
  ${svgBlock(input.layout.website, fonts.body, paint.title, 700)}
  ${svgBlock(input.layout.signOff, fonts.body, paint.muted, 500)}
</svg>`
}

function renderSvgPng(svg: string, fontFiles: string[]) {
  return Buffer.from(new Resvg(svg, flyerTextRenderOptions(fontFiles)).render().asPng())
}

export async function renderCardQrFlyerParts(
  input: CardQrFlyerRenderInput,
): Promise<CardQrFlyerRenderParts> {
  const fonts = FLYER_THEME_FONTS[input.appearancePreset]
  const familyFor = (role: FlyerTextRole): FlyerFontFamily =>
    role === 'heading' ? fonts.heading : fonts.body
  const prepare = (value: string, role: FlyerTextRole) => covered(value, familyFor(role))
  const showTitle = prepare(input.showTitle, 'heading')
  const tagline = prepare(input.tagline ?? '', 'body')
  const firstName = prepare(input.firstName ?? '', 'body')
  const website = input.website ? prepare(input.website, 'body') : null
  const measure = (text: string, role: FlyerTextRole, size: number) =>
    measureTextWidth(
      text,
      flyerFontFile(familyFor(role)),
      flyerFontFile(FLYER_FALLBACK_FONT),
      size,
    )
  const layout = layoutCardQrFlyer({
    showTitle,
    tagline,
    firstName,
    website,
    measure,
  })
  const fontFiles = flyerFontFilesForTheme(input.appearancePreset)
  const platePath = flyerPlateAbsolute(input.appearancePreset)
  const painted = await renderThemeBackground({
    palette: input.palette,
    appearancePreset: input.appearancePreset,
    layout,
  })
  const background =
    platePath && existsSync(platePath)
      ? await sharp(readFileSync(platePath))
          .resize(CARD_QR_FLYER_WIDTH, CARD_QR_FLYER_HEIGHT, { fit: 'cover', position: 'centre' })
          .composite([
            {
              input: renderSvgPng(centerScrimSvg(layout), fontFiles),
              left: 0,
              top: 0,
            },
          ])
          .png()
          .toBuffer()
      : painted
  const foreground = renderSvgPng(
    foregroundSvg({
      palette: input.palette,
      appearancePreset: input.appearancePreset,
      layout,
      showQr: input.showQr,
    }),
    fontFiles,
  )
  const layers: sharp.OverlayOptions[] = [{ input: foreground, left: 0, top: 0 }]
  if (input.showQr) {
    const qr = await sharp(await renderCardQrPng(input.destinationUrl, null, layout.qr.width))
      .resize(layout.qr.width, layout.qr.height, {
        fit: 'contain',
        background: CARD_QR_LIGHT,
      })
      .png()
      .toBuffer()
    layers.push({ input: qr, left: layout.qr.x, top: layout.qr.y })
  }
  const flyer = await sharp(background).composite(layers).png().toBuffer()
  return { background, flyer, layout }
}

export async function renderCardQrFlyerPng(input: CardQrFlyerRenderInput) {
  const parts = await renderCardQrFlyerParts(input)
  return parts.flyer
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/** One-page stand-in. Amelia still needs a real press PDF before a live print job. */
export function buildCardQrPressStubPdf(lines: string[]) {
  const commands = [
    'BT',
    '/F1 16 Tf',
    '48 740 Td',
    `(${escapePdfText('Sparkle Suite business card press file — Smoke stub')}) Tj`,
    '/F1 11 Tf',
    ...lines.flatMap((line) => ['0 -18 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n')
  const stream = commands
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += object
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

export function buildCardQrPressStubLines(input: {
  destinationUrl: string
  templateName: string
}) {
  return [
    'This is not a press-ready CMYK file.',
    `Trim ${CARD_QR_PRINT_SPEC.trim}`,
    `Bleed ${CARD_QR_PRINT_SPEC.bleed}`,
    `Safe zone ${CARD_QR_PRINT_SPEC.safe}`,
    CARD_QR_PRINT_SPEC.stock,
    `Template ${input.templateName}`,
    `QR ${input.destinationUrl}`,
    'Fulfillment is manual until Amelia automation exists.',
  ]
}
