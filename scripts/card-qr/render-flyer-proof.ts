import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { renderCheckedFlyerFiles } from '@/lib/workspace/card-qr/flyer-encode'
import { CARD_QR_SHARED_FLYER_THEMES } from '@/lib/workspace/card-qr/flyer-copy'
import { isKnownFlyerTheme } from '@/lib/workspace/card-qr/flyer-fonts'
import {
  parseCardQrFlyerFormat,
  type CardQrFlyerFormat,
} from '@/lib/workspace/card-qr/flyer-format'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrFlyerParts } from '@/lib/workspace/card-qr/render'
import { buildCardQrShortUrl } from '@/lib/workspace/card-qr/short-link'

const DUDE = {
  showTitle: "Dude's Fizzfest",
  tagline: 'Come for the fizz. Stay for the sparkle.',
  firstName: 'Louis',
  repId: 'a1b2c3d4-e5f6-4789-8012-3456789abcde',
}

const DUDE_QR_URL = buildCardQrShortUrl('https://sparkle-suite-smoke.vercel.app', DUDE.repId) as string

function optionalArg(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value || value.startsWith('--')) return undefined
  return value
}

function requiredArg(name: string) {
  const value = optionalArg(name)
  if (!value) {
    console.error(`Missing --${name}`)
    process.exit(1)
  }
  return value
}

function requireTheme(value: string): AmethystAppearancePresetId {
  if (!isKnownFlyerTheme(value)) {
    console.error(`Unknown theme "${value}".`)
    process.exit(1)
  }
  return value
}

function requireFormat(value: string | undefined): CardQrFlyerFormat {
  const format = parseCardQrFlyerFormat(value ?? 'png')
  if (!format || (value && value !== 'png' && value !== 'jpg' && value !== 'jpeg' && value !== '')) {
    console.error('--format must be png or jpg.')
    process.exit(1)
  }
  return format
}

async function renderDude(input: {
  theme: AmethystAppearancePresetId
  destinationUrl: string
  website: string | null
}) {
  const parts = await renderCardQrFlyerParts({
    palette: resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: input.theme,
    }),
    appearancePreset: input.theme,
    destinationUrl: input.destinationUrl,
    showQr: true,
    showTitle: DUDE.showTitle,
    tagline: DUDE.tagline,
    firstName: DUDE.firstName,
    website: input.website,
  })
  return renderCheckedFlyerFiles(parts.flyer, input.destinationUrl, parts.layout.qr)
}

async function writeOne() {
  const theme = requireTheme(requiredArg('theme'))
  const url = requiredArg('url')
  const business = requiredArg('business')
  const name = requiredArg('name')
  const out = requiredArg('out')
  const format = requireFormat(optionalArg('format'))
  const tagline = optionalArg('tagline') ?? ''
  const website = optionalArg('website') ?? null
  const parts = await renderCardQrFlyerParts({
    palette: resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: theme,
    }),
    appearancePreset: theme,
    destinationUrl: url,
    showQr: true,
    showTitle: business,
    tagline,
    firstName: name.split(/\s+/)[0] ?? '',
    website: website ? website.replace(/^www\./i, '').toUpperCase() : null,
  })
  const files = await renderCheckedFlyerFiles(parts.flyer, url, parts.layout.qr)
  const bytes = format === 'jpg' ? files.jpg : files.png
  writeFileSync(out, bytes)
  console.log(`Wrote ${out} (${format})`)
}

async function writeAll(directory: string) {
  mkdirSync(directory, { recursive: true })
  const thumbs: Array<{ file: string; label: string }> = []
  for (const theme of CARD_QR_SHARED_FLYER_THEMES) {
    for (const variant of ['custom-domain', 'suite-link'] as const) {
      const withDomain = variant === 'custom-domain'
      const files = await renderDude({
        theme,
        destinationUrl: DUDE_QR_URL,
        website: withDomain ? 'DUDESFIZZFEST.COM' : null,
      })
      const pngName = `${theme}-${variant}.png`
      const jpgName = `${theme}-${variant}.jpg`
      writeFileSync(path.join(directory, pngName), files.png)
      writeFileSync(path.join(directory, jpgName), files.jpg)
      thumbs.push({
        file: path.join(directory, pngName),
        label: `${theme} · ${withDomain ? 'custom domain' : 'no domain'}`,
      })
      console.log(`Wrote ${theme} ${variant}`)
    }
  }
  await writeContactSheet(directory, thumbs)
}

async function writeContactSheet(
  directory: string,
  thumbs: Array<{ file: string; label: string }>,
) {
  const columns = 7
  const thumbWidth = 180
  const thumbHeight = Math.round((thumbWidth * 1920) / 1080)
  const labelHeight = 48
  const gap = 14
  const pad = 24
  const rows = Math.ceil(thumbs.length / columns)
  const width = pad * 2 + columns * thumbWidth + (columns - 1) * gap
  const height = pad * 2 + 48 + rows * (thumbHeight + labelHeight) + (rows - 1) * gap
  const composites: sharp.OverlayOptions[] = []
  const labels: string[] = []
  for (const [index, thumb] of thumbs.entries()) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const left = pad + column * (thumbWidth + gap)
    const top = pad + 48 + row * (thumbHeight + labelHeight + gap)
    const image = await sharp(thumb.file)
      .resize(thumbWidth, thumbHeight, { fit: 'fill' })
      .png()
      .toBuffer()
    composites.push({ input: image, left, top })
    const [name, note] = thumb.label.split(' · ')
    const caption = (value: string) => value.replace(/&/g, '&amp;')
    labels.push(
      `<text x="${left + thumbWidth / 2}" y="${top + thumbHeight + 16}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#402924">${caption(name ?? thumb.label)}</text>`,
    )
    if (note) {
      labels.push(
        `<text x="${left + thumbWidth / 2}" y="${top + thumbHeight + 30}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#775d57">${caption(note)}</text>`,
      )
    }
  }
  const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fff6fa"/>
  <text x="${pad}" y="36" font-family="sans-serif" font-size="22" fill="#34252f">Dude's Fizzfest shared-theme flyers</text>
  ${labels.join('')}
</svg>`
  const base = await sharp(Buffer.from(sheet)).png().toBuffer()
  const out = path.join(directory, 'contact-sheet.png')
  await sharp(base).composite(composites).png().toFile(out)
  console.log(`Wrote ${out}`)
}

async function writeSheetFromFiles(directory: string) {
  const thumbs = CARD_QR_SHARED_FLYER_THEMES.flatMap((theme) =>
    (['custom-domain', 'suite-link'] as const).map((variant) => ({
      file: path.join(directory, `${theme}-${variant}.png`),
      label: `${theme} · ${variant === 'custom-domain' ? 'custom domain' : 'no domain'}`,
    })),
  )
  await writeContactSheet(directory, thumbs)
}

async function main() {
  const sheet = optionalArg('sheet')
  if (sheet) {
    await writeSheetFromFiles(sheet)
    return
  }
  const all = optionalArg('all')
  if (all) {
    await writeAll(all)
    return
  }
  await writeOne()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
