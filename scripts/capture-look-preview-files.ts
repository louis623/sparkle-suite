/**
 * Prove the capture worker against a public Smoke page. Writes WebP files only.
 *   npx tsx scripts/capture-look-preview-files.ts dudesfizzfest milehighfizz
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { captureLookPreviewShots } from '@/lib/look-preview/capture'
import { SMOKE_PUBLIC_ORIGIN, buildLookPreviewCaptureUrl } from '@/lib/look-preview/policy'

async function main() {
  const slugs = process.argv.slice(2)
  if (!slugs.length) throw new Error('Pass one or more public slugs.')
  const outDir = '/opt/cursor/artifacts'
  mkdirSync(outDir, { recursive: true })
  for (const slug of slugs) {
    const url = buildLookPreviewCaptureUrl({ slug, smoke: true })
    const shots = await captureLookPreviewShots(url, {
      allowedHosts: [new URL(SMOKE_PUBLIC_ORIGIN).hostname],
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    })
    if (!('desktop' in shots)) {
      console.log(JSON.stringify({ slug, status: shots.reason }))
      continue
    }
    const desktop = `${outDir}/look-${slug}-desktop.webp`
    const phone = `${outDir}/look-${slug}-phone.webp`
    writeFileSync(desktop, shots.desktop)
    writeFileSync(phone, shots.phone)
    console.log(JSON.stringify({
      slug,
      status: 'ready',
      desktopBytes: shots.desktopBytes,
      phoneBytes: shots.phoneBytes,
      desktop,
      phone,
    }))
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'capture failed')
  process.exit(1)
})
