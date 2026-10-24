/* eslint-disable @next/next/no-img-element -- Satori image responses render plain img elements. */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { ImageResponse } from 'next/og'
import sharp from 'sharp'

import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import {
  getCustomerSiteExplicitShareLines,
  getCustomerSiteSharePalette,
} from '@/lib/amethyst/customer-site-brand-assets'
import { getCustomerSiteBrandImageFonts } from '@/lib/amethyst/customer-site-brand-fonts'
import { loadCustomerSiteBrandImageDataUri } from '@/lib/amethyst/customer-site-brand-image-assets'
import { FallOwlShareCard } from '@/lib/amethyst/fall-owl-share-card'
import { loadFallOwlShareSceneDataUri } from '@/lib/amethyst/fall-owl-share-art'

const outDir = resolve(
  process.cwd(),
  'docs/sparkle-suite/qa/2026-10-24-blingwithkrissig-brand-assets',
)

async function png(response: Response) {
  if (!response.ok) throw new Error(`Image render failed (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const tagline = 'Live jewelry reveals weekdays at 11:30 AM ET and Saturdays at 5 PM ET'
  const palette = getCustomerSiteSharePalette('fall_owl_harvest_moon')
  const lines = getCustomerSiteExplicitShareLines({
    explicitHeroTitle: '',
    heroSubtitle: "I'm Kristin - join me for live reveals, favorite finds, and customer-first sparkle.",
    tagline,
  })
  const [fonts, sceneSrc, markSrc] = await Promise.all([
    getCustomerSiteBrandImageFonts(null),
    loadFallOwlShareSceneDataUri(),
    loadCustomerSiteBrandImageDataUri('/customer-site-assets/blingwithkrissig-monogram-b.png'),
  ])
  const card = await png(new ImageResponse(
    (
      <FallOwlShareCard
        businessName="BlingwithKrissiG"
        customDomain="blingwithkrissig.com"
        headline={lines.headline}
        markSrc={markSrc}
        palette={palette}
        sceneSrc={sceneSrc}
        support={lines.support}
        themeLabel={getAmethystAppearancePreset('fall_owl_harvest_moon').label}
      />
    ),
    { width: 1200, height: 630, fonts },
  ))
  const icon = await png(new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#1d1719',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <img alt="BlingwithKrissiG monogram" height={192} src={markSrc} width={192} />
      </div>
    ),
    { width: 192, height: 192, fonts },
  ))

  await mkdir(outDir, { recursive: true })
  await writeFile(resolve(outDir, 'opengraph-image.png'), card)
  await writeFile(resolve(outDir, 'icon-192.png'), icon)
  await sharp(icon).resize(32, 32).png().toFile(resolve(outDir, 'icon-32.png'))
  await sharp(icon).resize(16, 16).png().toFile(resolve(outDir, 'icon-16.png'))
  console.log(JSON.stringify({
    outDir,
    headline: lines.headline,
    support: lines.support,
    cardBytes: card.length,
    iconBytes: icon.length,
  }))
}

main()
