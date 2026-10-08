import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js'
import QRCode from 'qrcode'
import sharp from 'sharp'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import {
  FLYER_FALLBACK_FONT,
  FLYER_FONT_FACES,
  FLYER_THEME_FONTS,
  flyerFontFile,
  flyerFontFilesForTheme,
  type FlyerFontFamily,
} from '@/lib/workspace/card-qr/flyer-fonts'
import { retainCoveredGlyphs } from '@/lib/workspace/card-qr/glyphs'
import type { CardQrPalette } from '@/lib/workspace/card-qr/palette'
import { CARD_QR_PRINT_SPEC } from '@/lib/workspace/card-qr/pricing'

export const CARD_QR_FLYER_WIDTH = 1080
export const CARD_QR_FLYER_HEIGHT = 1920
export const CARD_QR_FLYER_SAFE_TOP = 280
export const CARD_QR_FLYER_SAFE_BOTTOM = 360
export const CARD_QR_DARK = '#111111'
export const CARD_QR_LIGHT = '#FFFFFF'
export const CARD_QR_ERROR_CORRECTION = 'H' as const
export const CARD_QR_MARGIN = 4
export const CARD_QR_FLYER_QR_SIZE = 560

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

export function flyerQrPlacement(lineCount: number, showQr = true) {
  const size = showQr ? CARD_QR_FLYER_QR_SIZE : 0
  const textBlockHeight = lineCount * 64
  const contentHeight = textBlockHeight + (showQr ? size + 48 : 0)
  const safeTop = CARD_QR_FLYER_SAFE_TOP
  const safeBottom = CARD_QR_FLYER_HEIGHT - CARD_QR_FLYER_SAFE_BOTTOM
  const safeHeight = safeBottom - safeTop
  const contentTop = safeTop + Math.max(0, Math.round((safeHeight - contentHeight) / 2))
  const top = contentTop + textBlockHeight + (lineCount ? 36 : 0)
  return {
    contentTop,
    size,
    left: Math.round((CARD_QR_FLYER_WIDTH - size) / 2),
    top: Math.round(top),
  }
}

function coveredLine(text: string, family: FlyerFontFamily) {
  return retainCoveredGlyphs(
    text,
    flyerFontFile(family),
    flyerFontFile(FLYER_FALLBACK_FONT),
  )
}

function lineFamily(
  line: string,
  index: number,
  lines: string[],
  businessName: string | undefined,
  heading: FlyerFontFamily,
  body: FlyerFontFamily,
) {
  const business = businessName?.trim() ?? ''
  if (business && line === business && index === lines.indexOf(business)) {
    return heading
  }
  return body
}

function svgText(input: {
  value: string
  y: number
  family: FlyerFontFamily
  size: number
  fill: string
}) {
  const familyName = FLYER_FONT_FACES[input.family].family
  return `<text x="540" y="${input.y}" text-anchor="middle" font-family="${escapeXml(familyName)}" font-weight="400" font-size="${input.size}" fill="${input.fill}">${escapeXml(input.value)}</text>`
}

export async function renderCardQrFlyerPng(input: {
  palette: CardQrPalette
  lines: string[]
  destinationUrl: string
  showQr: boolean
  appearancePreset: AmethystAppearancePresetId
  businessName?: string | null
}) {
  const themeFonts = FLYER_THEME_FONTS[input.appearancePreset]
  const body = themeFonts.body
  const placement = flyerQrPlacement(input.lines.length, input.showQr)
  const contentTop = placement.contentTop

  const text = input.lines
    .map((line, index) => {
      const family = lineFamily(
        line,
        index,
        input.lines,
        input.businessName ?? undefined,
        themeFonts.heading,
        body,
      )
      const y = contentTop + 56 + index * 64
      return svgText({
        value: coveredLine(line, family),
        y,
        family,
        size: 42,
        fill: input.palette.ink,
      })
    })
    .join('')

  const whitePad = input.showQr
    ? `<rect x="${placement.left}" y="${placement.top}" width="${placement.size}" height="${placement.size}" fill="${CARD_QR_LIGHT}"/>`
    : ''
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${input.palette.background}"/>
  <rect x="0" y="0" width="1080" height="28" fill="${input.palette.accent}"/>
  ${svgText({
    value: coveredLine('Sparkle Suite', body),
    y: 210,
    family: body,
    size: 28,
    fill: input.palette.muted,
  })}
  ${text}
  ${whitePad}
  ${svgText({
    value: coveredLine('Scan to visit', body),
    y: 1760,
    family: body,
    size: 24,
    fill: input.palette.muted,
  })}
</svg>`

  const fontFiles = flyerFontFilesForTheme(input.appearancePreset)
  const png = Buffer.from(
    new Resvg(svg, flyerTextRenderOptions(fontFiles)).render().asPng(),
  )
  if (!input.showQr) {
    return png
  }

  const qr = await renderCardQrPng(input.destinationUrl, null, placement.size)
  return sharp(png)
    .composite([
      {
        input: qr,
        left: placement.left,
        top: placement.top,
      },
    ])
    .png()
    .toBuffer()
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
