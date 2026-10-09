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
  type FlyerLayout,
  type FlyerTextBlock,
  type FlyerTextRole,
} from '@/lib/workspace/card-qr/flyer-layout'
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

function hexToRgb(hex: string) {
  const value = hex.replace('#', '').trim()
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex(red: number, green: number, blue: number) {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(red)}${channel(green)}${channel(blue)}`
}

function mixHex(start: string, end: string, amount: number) {
  const from = hexToRgb(start)
  const to = hexToRgb(end)
  return rgbToHex(
    from.r + (to.r - from.r) * amount,
    from.g + (to.g - from.g) * amount,
    from.b + (to.b - from.b) * amount,
  )
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function onFill(hex: string) {
  return luminance(hex) > 0.45 ? '#1a1208' : '#ffffff'
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
}) {
  const familyName = FLYER_FONT_FACES[input.family].family
  return `<text x="540" y="${input.y}" text-anchor="middle" dominant-baseline="hanging" font-family="${escapeXml(familyName)}" font-weight="${input.weight}" font-size="${input.size}" fill="${input.fill}">${escapeXml(input.value)}</text>`
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

function sparkles(accent: string) {
  const dots: string[] = []
  for (let index = 0; index < 42; index += 1) {
    const x = 24 + ((index * 173) % 1032)
    const y = 18 + ((index * 251) % 1884)
    const radius = 1.4 + (index % 3) * 0.7
    const opacity = 0.16 + (index % 4) * 0.05
    dots.push(
      `<circle cx="${x}" cy="${y}" r="${radius}" fill="${accent}" fill-opacity="${opacity.toFixed(2)}"/>`,
    )
  }
  return dots.join('')
}

function backgroundSvg(input: {
  palette: CardQrPalette
  appearancePreset: AmethystAppearancePresetId
  layout: FlyerLayout
}) {
  const primary = AMETHYST_APPEARANCE_PRESETS[input.appearancePreset].values.primaryColor
  const ground = input.palette.background
  const dark = luminance(ground) < 0.4
  const deep = dark ? mixHex(ground, primary, 0.42) : mixHex(primary, ground, 0.28)
  const mid = mixHex(ground, input.palette.accent, dark ? 0.22 : 0.12)
  const glow = input.layout.qr
  const glowY = glow.y + glow.height / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flyerGround" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ground}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <radialGradient id="flyerGlow" cx="${CARD_QR_FLYER_WIDTH / 2}" cy="${glowY}" r="320" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${input.palette.accent}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${input.palette.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#flyerGround)"/>
  ${sparkles(input.palette.accent)}
  <ellipse cx="${CARD_QR_FLYER_WIDTH / 2}" cy="${glowY}" rx="300" ry="250" fill="url(#flyerGlow)"/>
</svg>`
}

function foregroundSvg(input: {
  palette: CardQrPalette
  appearancePreset: AmethystAppearancePresetId
  layout: FlyerLayout
  showQr: boolean
}) {
  const fonts = FLYER_THEME_FONTS[input.appearancePreset]
  const kind = flyerPanelKind(input.appearancePreset)
  const primary = AMETHYST_APPEARANCE_PRESETS[input.appearancePreset].values.primaryColor
  const frameColor =
    Math.abs(luminance(input.palette.accent) - luminance(input.palette.background)) > 0.18
      ? input.palette.accent
      : primary
  const panel = input.layout.panel
  const panelFill =
    kind === 'parchment' ? mixHex(input.palette.panel, '#f3e2c4', 0.35) : input.palette.panel
  const panelOpacity = kind === 'glass' ? 0.84 : 0.96
  const panelMarkup = panel
    ? `<rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" rx="${kind === 'parchment' ? 18 : 28}" fill="${panelFill}" fill-opacity="${panelOpacity}" stroke="${frameColor}" stroke-width="${kind === 'glass' ? 3 : 2}"/>`
    : ''
  const { pill, qr, qrFrame } = input.layout
  const pillTextY = pill.y + (pill.height - input.layout.pillSize) / 2
  const qrMarkup = input.showQr
    ? `<rect x="${qrFrame.x}" y="${qrFrame.y}" width="${qrFrame.width}" height="${qrFrame.height}" rx="28" fill="${frameColor}"/>
       <rect x="${qr.x}" y="${qr.y}" width="${qr.width}" height="${qr.height}" rx="6" fill="${CARD_QR_LIGHT}"/>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${panelMarkup}
  ${svgBlock(input.layout.showTitle, fonts.heading, input.palette.ink, 600)}
  ${svgBlock(input.layout.tagline, fonts.body, input.palette.ink, 400)}
  <rect x="${pill.x}" y="${pill.y}" width="${pill.width}" height="${pill.height}" rx="29" fill="${primary}"/>
  ${svgText({
    value: FLYER_SCAN_LABEL,
    y: pillTextY,
    family: fonts.body,
    size: input.layout.pillSize,
    fill: onFill(primary),
    weight: 700,
  })}
  ${qrMarkup}
  ${svgBlock(input.layout.instructions, fonts.body, input.palette.muted, 400)}
  ${svgBlock(input.layout.website, fonts.body, input.palette.ink, 600)}
  ${svgBlock(input.layout.signOff, fonts.body, input.palette.muted, 400)}
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
  const background = renderSvgPng(
    backgroundSvg({
      palette: input.palette,
      appearancePreset: input.appearancePreset,
      layout,
    }),
    fontFiles,
  )
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
