import QRCode from 'qrcode'
import sharp from 'sharp'
import type { CardQrPalette } from '@/lib/workspace/card-qr/palette'
import { CARD_QR_PRINT_SPEC } from '@/lib/workspace/card-qr/pricing'

export const CARD_QR_FLYER_WIDTH = 1080
export const CARD_QR_FLYER_HEIGHT = 1920
export const CARD_QR_FLYER_SAFE_TOP = 280
export const CARD_QR_FLYER_SAFE_BOTTOM = 360

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function renderCardQrPng(url: string, palette: Pick<CardQrPalette, 'qrDark' | 'qrLight'>) {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 640,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: palette.qrDark,
      light: palette.qrLight,
    },
  })
}

export async function renderCardQrFlyerPng(input: {
  palette: CardQrPalette
  lines: string[]
  destinationUrl: string
  showQr: boolean
}) {
  const qrSize = input.showQr ? 560 : 0
  const textBlockHeight = input.lines.length * 64
  const contentHeight = textBlockHeight + (input.showQr ? qrSize + 48 : 0)
  const safeTop = CARD_QR_FLYER_SAFE_TOP
  const safeBottom = CARD_QR_FLYER_HEIGHT - CARD_QR_FLYER_SAFE_BOTTOM
  const safeHeight = safeBottom - safeTop
  const contentTop = safeTop + Math.max(0, Math.round((safeHeight - contentHeight) / 2))

  const text = input.lines
    .map((line, index) => {
      const y = contentTop + 56 + index * 64
      return `<text x="540" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="${input.palette.ink}">${escapeXml(line)}</text>`
    })
    .join('')

  const qrTop = contentTop + textBlockHeight + (input.lines.length ? 36 : 0)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_QR_FLYER_WIDTH}" height="${CARD_QR_FLYER_HEIGHT}" viewBox="0 0 ${CARD_QR_FLYER_WIDTH} ${CARD_QR_FLYER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${input.palette.background}"/>
  <rect x="0" y="0" width="1080" height="28" fill="${input.palette.accent}"/>
  <text x="540" y="210" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="${input.palette.muted}">Sparkle Suite</text>
  ${text}
  <text x="540" y="1760" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${input.palette.muted}">Scan to visit</text>
</svg>`

  const base = sharp(Buffer.from(svg)).png()
  if (!input.showQr) {
    return base.toBuffer()
  }

  const qr = await renderCardQrPng(input.destinationUrl, input.palette)
  const resized = await sharp(qr).resize(qrSize, qrSize).png().toBuffer()
  return sharp(Buffer.from(svg))
    .composite([
      {
        input: resized,
        left: Math.round((CARD_QR_FLYER_WIDTH - qrSize) / 2),
        top: Math.round(qrTop),
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
