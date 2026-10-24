/* eslint-disable @next/next/no-img-element -- Satori image responses render plain img elements. */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { ImageResponse } from 'next/og'
import sharp from 'sharp'

import { getAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import {
  getCustomerSiteExplicitShareLines,
  getCustomerSiteMarkIconBackground,
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
  const markPath = '/customer-site-assets/blingwithkrissig-monogram-b.png'
  const plate = getCustomerSiteMarkIconBackground(markPath)
  async function markPlate(width: number, height: number) {
    return png(new ImageResponse(
      (
        <div
          style={{
            alignItems: 'center',
            background: plate,
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <img alt="BlingwithKrissiG monogram" height={height} src={markSrc} width={width} />
        </div>
      ),
      { width, height, fonts },
    ))
  }
  const icon = await markPlate(192, 192)
  const appleIcon = await markPlate(180, 180)
  const master = await sharp(resolve(process.cwd(), `public${markPath}`)).png().toBuffer()

  await mkdir(outDir, { recursive: true })
  await writeFile(resolve(outDir, 'opengraph-image.png'), card)
  await writeFile(resolve(outDir, 'icon-192.png'), icon)
  await sharp(icon).resize(32, 32).png().toFile(resolve(outDir, 'icon-32.png'))
  await sharp(icon).resize(16, 16).png().toFile(resolve(outDir, 'icon-16.png'))
  await sharp(master).resize(512, 512).png().toFile(resolve(outDir, 'icon-512.png'))
  await writeFile(resolve(outDir, 'apple-icon.png'), appleIcon)

  const cardImage = sharp(card).ensureAlpha()
  const { data, info } = await cardImage.raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let maxX = 0
  let minY = info.height
  let maxY = 0
  for (let y = 430; y < info.height; y += 1) {
    for (let x = 0; x < 620; x += 1) {
      const index = (y * info.width + x) * info.channels
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      if (red > 236 && green > 200 && blue > 150 && red > blue + 40) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }
  const pad = 54
  const crop = {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(info.width, maxX + pad) - Math.max(0, minX - pad),
    height: Math.min(info.height, maxY + pad) - Math.max(0, minY - pad),
  }
  const cropped = await sharp(card).extract(crop).resize(crop.width * 3, crop.height * 3, { kernel: 'nearest' }).png().toBuffer()
  await writeFile(resolve(outDir, 'opengraph-mark-crop.png'), cropped)
  console.log(JSON.stringify({
    outDir,
    headline: lines.headline,
    support: lines.support,
    plate,
    cardBytes: card.length,
    iconBytes: icon.length,
    appleBytes: appleIcon.length,
    crop,
  }))
}

main()
