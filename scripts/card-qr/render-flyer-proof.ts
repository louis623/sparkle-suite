import { writeFileSync } from 'node:fs'
import {
  AMETHYST_APPEARANCE_PRESET_IDS,
  type AmethystAppearancePresetId,
} from '@/lib/amethyst/appearance-presets'
import { assertFlyerQrDecodes } from '@/lib/workspace/card-qr/flyer-decode'
import { isKnownFlyerTheme } from '@/lib/workspace/card-qr/flyer-fonts'
import { resolveCardQrPalette } from '@/lib/workspace/card-qr/palette'
import { renderCardQrFlyerPng } from '@/lib/workspace/card-qr/render'

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value || value.startsWith('--')) {
    console.error(`Missing --${name}`)
    process.exit(1)
  }
  return value
}

function requireTheme(value: string): AmethystAppearancePresetId {
  if (!isKnownFlyerTheme(value)) {
    console.error(
      `Unknown theme "${value}". Known: ${AMETHYST_APPEARANCE_PRESET_IDS.join(', ')}`,
    )
    process.exit(1)
  }
  return value
}

const theme = requireTheme(arg('theme'))
const url = arg('url')
const business = arg('business')
const name = arg('name')
const out = arg('out')

async function main() {
  const lines = [business]
  if (name.localeCompare(business, undefined, { sensitivity: 'base' }) !== 0) {
    lines.push(name)
  }

  const png = await renderCardQrFlyerPng({
    palette: resolveCardQrPalette({
      templateId: 'match-site',
      appearancePreset: theme,
    }),
    lines,
    businessName: business,
    appearancePreset: theme,
    destinationUrl: url,
    showQr: true,
  })

  try {
    await assertFlyerQrDecodes(png, url)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }

  writeFileSync(out, png)
  console.log(`Wrote ${out}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
