import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { Resvg } from '@resvg/resvg-js'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { CARD_QR_ICONS, type CardQrIcon } from '@/lib/workspace/card-qr/design'
import { flyerFontFile } from '@/lib/workspace/card-qr/flyer-fonts'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrPng } from '@/lib/workspace/card-qr/render'
import { buildCardQrShortUrl } from '@/lib/workspace/card-qr/short-link'

const REP_ID = 'a1b2c3d4-e5f6-4789-8012-3456789abcde'
const ORIGIN = 'https://sparkle-suite-smoke.vercel.app'
const LONG_URL = `${ORIGIN}/fizzfest`
const SHORT_URL = buildCardQrShortUrl(ORIGIN, REP_ID) as string
const THEMES = [
  'sparkle_suite_morganite',
  'emerald_garden',
  'midnight_rose',
  'halloween_pumpkin_cat',
] as const satisfies readonly AmethystAppearancePresetId[]

function caption(text: string, width: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="48">
    <text x="${width / 2}" y="32" text-anchor="middle" font-family="Noto Sans" font-size="22" fill="#241018">${text}</text>
  </svg>`
  return new Resvg(svg, {
    font: {
      fontFiles: [flyerFontFile('Noto Sans')],
      loadSystemFonts: false,
      defaultFontFamily: 'Noto Sans',
    },
  })
    .render()
    .asPng()
}

async function tile(input: { png: Buffer; label: string; size: number }) {
  const image = await sharp(input.png)
    .resize(input.size, input.size, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer()
  const label = caption(input.label, input.size)
  return sharp({
    create: {
      width: input.size,
      height: input.size + 48,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([
      { input: image, top: 0, left: 0 },
      { input: label, top: input.size, left: 0 },
    ])
    .png()
    .toBuffer()
}

async function sheet(tiles: Buffer[], columns: number, cell: number) {
  const rows = Math.ceil(tiles.length / columns)
  const width = columns * cell
  const height = rows * (cell + 48)
  return sharp({
    create: { width, height, channels: 4, background: '#f6efe8' },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left: (index % columns) * cell,
        top: Math.floor(index / columns) * (cell + 48),
      })),
    )
    .png()
    .toBuffer()
}

async function main() {
  const out = process.argv[2]
  if (!out) {
    console.error('Usage: tsx scripts/card-qr/render-qr-short-link-proof.ts <directory>')
    process.exit(1)
  }
  mkdirSync(out, { recursive: true })
  // The old product always used level H. Re-draw that dense code beside the new one.
  const oldDense = await import('qrcode').then((QRCode) =>
    QRCode.toBuffer(LONG_URL, {
      type: 'png',
      width: 640,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#111111', light: '#ffffff' },
    }),
  )
  const morganite = resolveCardQrPalette({
    templateId: 'match-site',
    appearancePreset: 'sparkle_suite_morganite',
  })
  const nextPng = await renderCardQrPng(SHORT_URL, morganite, 640, 'none')
  const before = await tile({ png: oldDense, label: 'Before · full URL · level H', size: 640 })
  const after = await tile({ png: nextPng, label: 'After · short link · level M', size: 640 })
  const comparison = await sheet([before, after], 2, 640)
  await sharp(comparison).png().toFile(path.join(out, 'before-after.png'))

  const gridTiles: Buffer[] = []
  for (const theme of THEMES) {
    const palette = resolveCardQrPalette({ templateId: 'match-site', appearancePreset: theme })
    for (const icon of CARD_QR_ICONS) {
      const png = await renderCardQrPng(SHORT_URL, palette, 480, icon as CardQrIcon)
      const label = `${palette.name} · ${icon}`
      gridTiles.push(await tile({ png, label, size: 480 }))
    }
  }
  const grid = await sheet(gridTiles, 3, 480)
  await sharp(grid).png().toFile(path.join(out, 'icon-grid.png'))
  console.log(`Wrote ${path.join(out, 'before-after.png')}`)
  console.log(`Wrote ${path.join(out, 'icon-grid.png')}`)
  console.log('short', SHORT_URL)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
