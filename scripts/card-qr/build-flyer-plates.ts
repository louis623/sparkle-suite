import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { FLYER_THEME_RECORDS } from '@/lib/workspace/card-qr/flyer-themes'

const WIDTH = 1080
const HEIGHT = 1920

interface Band {
  srcLeft?: number
  srcTop: number
  srcWidth?: number
  srcHeight: number
  destWidth?: number
  destHeight: number
  destLeft?: number
  destTop: number
  fade: 'down' | 'up' | 'none'
  flipX?: boolean
  flipY?: boolean
}

interface PlatePlan {
  base: 'cover' | 'black'
  position?: 'centre' | 'left' | 'right' | 'north' | 'south' | 'attention'
  blur?: number
  brightness?: number
  bands: Band[]
  vignette: number
  glow?: string
  extras?: Array<{ file: string; width: number; left: number; top: number }>
}

function fadeSvg(width: number, height: number, direction: 'down' | 'up') {
  const stops =
    direction === 'down'
      ? [
          [0, 1],
          [0.62, 1],
          [0.84, 0.35],
          [1, 0],
        ]
      : [
          [0, 0],
          [0.16, 0.35],
          [0.38, 1],
          [1, 1],
        ]
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      ${stops
        .map(
          ([offset, opacity]) =>
            `<stop offset="${offset}" stop-color="#ffffff" stop-opacity="${opacity}"/>`,
        )
        .join('')}
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
</svg>`)
}

async function masked(image: Buffer, width: number, height: number, direction: 'down' | 'up') {
  const mask = await sharp(fadeSvg(width, height, direction)).png().toBuffer()
  return sharp(image).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function vignette(opacity: number) {
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="quiet" cx="540" cy="980" r="620" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000000" stop-opacity="${opacity}"/>
      <stop offset="0.55" stop-color="#000000" stop-opacity="${(opacity * 0.45).toFixed(3)}"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#quiet)"/>
</svg>`)
  return sharp(svg).png().toBuffer()
}

async function makeBand(source: string, spec: Band) {
  const meta = await sharp(source).metadata()
  const srcW = meta.width ?? WIDTH
  const srcH = meta.height ?? HEIGHT
  const left = Math.round((spec.srcLeft ?? 0) * srcW)
  const top = Math.round(spec.srcTop * srcH)
  const width = Math.max(1, Math.min(srcW - left, Math.round((spec.srcWidth ?? 1) * srcW)))
  const height = Math.max(1, Math.min(srcH - top, Math.round(spec.srcHeight * srcH)))
  let pipeline = sharp(source).extract({ left, top, width, height })
  if (spec.flipY) pipeline = pipeline.flip()
  if (spec.flipX) pipeline = pipeline.flop()
  const destWidth = spec.destWidth ?? WIDTH
  let image = await pipeline
    .resize(destWidth, spec.destHeight, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()
  if (spec.fade !== 'none') image = await masked(image, destWidth, spec.destHeight, spec.fade)
  return {
    input: image,
    left: spec.destLeft ?? Math.round((WIDTH - destWidth) / 2),
    top: spec.destTop,
  }
}

const PLANS: Record<string, PlatePlan> = {
  halloween_pumpkin_cat: {
    base: 'black',
    glow: '#ff6a00',
    vignette: 0.35,
    bands: [
      { srcTop: 0, srcHeight: 0.36, destHeight: 780, destTop: -250, fade: 'down' },
      { srcTop: 0.74, srcHeight: 0.26, destHeight: 400, destTop: 1520, fade: 'none' },
    ],
  },
  halloween_pumpkin_witch: {
    base: 'black',
    glow: '#ff7a18',
    vignette: 0.15,
    bands: [
      { srcTop: 0, srcHeight: 1, destHeight: 700, destTop: 0, fade: 'down' },
    ],
    extras: [
      {
        file: 'public/amethyst/skins/halloween-pumpkin-witch/bats.webp',
        width: 1040,
        left: 20,
        top: 18,
      },
      {
        file: 'public/amethyst/skins/halloween-pumpkin-witch/witch.webp',
        width: 1020,
        left: 30,
        top: 1450,
      },
    ],
  },
  amethyst: {
    base: 'cover',
    position: 'right',
    blur: 18,
    brightness: 0.72,
    vignette: 0.42,
    bands: [
      {
        srcLeft: 0.22,
        srcTop: 0,
        srcWidth: 0.78,
        srcHeight: 1,
        destHeight: 860,
        destTop: 0,
        fade: 'down',
      },
      {
        srcLeft: 0,
        srcTop: 0.78,
        srcWidth: 0.58,
        srcHeight: 0.22,
        destHeight: 460,
        destTop: 1460,
        fade: 'up',
      },
    ],
  },
  gilded_autumn: {
    base: 'cover',
    position: 'centre',
    blur: 16,
    brightness: 0.78,
    vignette: 0.28,
    bands: [
      { srcTop: 0, srcHeight: 0.58, destHeight: 760, destTop: 0, fade: 'down' },
      { srcTop: 0.48, srcHeight: 0.52, destHeight: 720, destTop: 1200, fade: 'up' },
    ],
  },
  midnight_rose: {
    base: 'cover',
    position: 'centre',
    blur: 14,
    brightness: 0.7,
    vignette: 0.34,
    bands: [
      { srcTop: 0.38, srcHeight: 0.62, destHeight: 740, destTop: 0, fade: 'down', flipY: true },
      { srcTop: 0.42, srcHeight: 0.58, destHeight: 700, destTop: 1220, fade: 'up' },
    ],
  },
  pearl_rose: {
    base: 'cover',
    position: 'attention',
    blur: 14,
    brightness: 0.86,
    vignette: 0.22,
    bands: [
      { srcTop: 0.4, srcHeight: 0.6, destHeight: 740, destTop: 0, fade: 'down', flipY: true },
      { srcTop: 0.46, srcHeight: 0.54, destHeight: 700, destTop: 1220, fade: 'up' },
    ],
  },
  rose_champagne: {
    base: 'cover',
    position: 'centre',
    blur: 14,
    brightness: 0.84,
    vignette: 0.2,
    bands: [
      { srcTop: 0.42, srcHeight: 0.58, destHeight: 740, destTop: 0, fade: 'down', flipY: true },
      { srcTop: 0.4, srcHeight: 0.6, destHeight: 720, destTop: 1200, fade: 'up' },
    ],
  },
}

async function buildPlate(source: string, plan: PlatePlan) {
  const base =
    plan.base === 'black'
      ? await sharp({
          create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#07060c' },
        })
          .png()
          .toBuffer()
      : await sharp(source)
          .resize(WIDTH, HEIGHT, {
            fit: 'cover',
            position: plan.position ?? 'centre',
          })
          .blur(plan.blur ?? 0)
          .modulate({ brightness: plan.brightness ?? 1 })
          .png()
          .toBuffer()
  const bands = []
  if (plan.glow) {
    const glow = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="540" cy="1040" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${plan.glow}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${plan.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#glow)"/>
</svg>`)
    bands.push({ input: await sharp(glow).png().toBuffer(), left: 0, top: 0 })
  }
  for (const spec of plan.bands) bands.push(await makeBand(source, spec))
  const extras = []
  for (const extra of plan.extras ?? []) {
    extras.push({
      input: await sharp(path.join(process.cwd(), extra.file))
        .resize({ width: extra.width })
        .png()
        .toBuffer(),
      left: extra.left,
      top: extra.top,
    })
  }
  return sharp(base)
    .composite([...bands, { input: await vignette(plan.vignette), left: 0, top: 0 }, ...extras])
    .webp({ quality: 84 })
    .toBuffer()
}

async function main() {
  for (const record of FLYER_THEME_RECORDS) {
    if (record.status !== 'art' || !record.plate || !record.source) continue
    const plan = PLANS[record.theme]
    if (!plan) throw new Error(`No plate plan for ${record.theme}`)
    const plate = path.join(process.cwd(), record.plate)
    mkdirSync(path.dirname(plate), { recursive: true })
    const bytes = await buildPlate(path.join(process.cwd(), record.source), plan)
    await sharp(bytes).toFile(plate)
    console.log(`${record.theme} ${Math.round(bytes.length / 1024)}KB`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
