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
  fade: 'down' | 'up' | 'left' | 'right' | 'none'
  flipX?: boolean
  flipY?: boolean
}

interface PlatePlan {
  position?: 'centre' | 'left' | 'right' | 'north' | 'south' | 'attention'
  blur?: number
  brightness?: number
  /** How much of the sharp scene stays in the middle. The edges stay sharp. */
  centerHold?: number
  bands: Band[]
  vignette: number
  glow?: string
  extras?: Array<{ file: string; width: number; left: number; top: number }>
}

function fadeSvg(width: number, height: number, direction: Band['fade']) {
  const vertical = direction === 'down' || direction === 'up'
  const stops =
    direction === 'down'
      ? [
          [0, 1],
          [0.58, 1],
          [0.82, 0.4],
          [1, 0],
        ]
      : direction === 'up'
        ? [
            [0, 0],
            [0.18, 0.4],
            [0.4, 1],
            [1, 1],
          ]
        : direction === 'right'
          ? [
              [0, 1],
              [0.5, 0.85],
              [0.78, 0.35],
              [1, 0],
            ]
          : [
              [0, 0],
              [0.22, 0.35],
              [0.5, 0.85],
              [1, 1],
            ]
  const coords = vertical ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"'
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" ${coords}>
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

async function masked(image: Buffer, width: number, height: number, direction: Band['fade']) {
  if (direction === 'none') return image
  const mask = await sharp(fadeSvg(width, height, direction)).png().toBuffer()
  return sharp(image).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function edgeMask(centerHold: number) {
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="edge" cx="540" cy="980" r="760" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${centerHold}"/>
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="${Math.min(1, centerHold + 0.35).toFixed(2)}"/>
      <stop offset="0.72" stop-color="#ffffff" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#edge)"/>
</svg>`)
  return sharp(svg).png().toBuffer()
}

async function vignette(opacity: number) {
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="quiet" cx="540" cy="1000" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000000" stop-opacity="${opacity}"/>
      <stop offset="0.7" stop-color="#000000" stop-opacity="${(opacity * 0.25).toFixed(3)}"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#quiet)"/>
</svg>`)
  return sharp(svg).png().toBuffer()
}

function starField(tint: string) {
  let seed = 91
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const marks: string[] = []
  for (let index = 0; index < 180; index += 1) {
    const x = Math.round(next() * WIDTH)
    const y = Math.round(next() * HEIGHT)
    const roll = next()
    if (roll < 0.7) {
      marks.push(
        `<circle cx="${x}" cy="${y}" r="${(0.4 + next() * 1.6).toFixed(2)}" fill="#ffffff" fill-opacity="${(0.25 + next() * 0.65).toFixed(2)}"/>`,
      )
    } else {
      const size = roll < 0.92 ? 3 + next() * 5 : 8 + next() * 9
      const color = index % 5 === 0 ? tint : '#ffffff'
      const opacity = (0.35 + next() * 0.55).toFixed(2)
      marks.push(
        `<g transform="translate(${x},${y}) rotate(${Math.round(next() * 40)})" fill="${color}" fill-opacity="${opacity}"><polygon points="0,${-size} ${size * 0.16},${-size * 0.16} ${size},0 ${size * 0.16},${size * 0.16} 0,${size} ${-size * 0.16},${size * 0.16} ${-size},0 ${-size * 0.16},${-size * 0.16}"/></g>`,
      )
    }
  }
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${marks.join('')}</svg>`)
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
  image = await masked(image, destWidth, spec.destHeight, spec.fade)
  return {
    input: image,
    left: spec.destLeft ?? Math.round((WIDTH - destWidth) / 2),
    top: spec.destTop,
  }
}

const PLANS: Record<string, PlatePlan> = {
  halloween_pumpkin_cat: {
    position: 'centre',
    blur: 22,
    brightness: 0.92,
    centerHold: 0.42,
    glow: '#ff7a18',
    vignette: 0.16,
    bands: [
      { srcTop: 0, srcHeight: 0.4, destHeight: 860, destTop: -160, fade: 'down' },
      { srcTop: 0.68, srcHeight: 0.32, destHeight: 620, destTop: 1320, fade: 'up' },
      {
        srcLeft: 0,
        srcTop: 0.55,
        srcWidth: 0.34,
        srcHeight: 0.34,
        destWidth: 340,
        destHeight: 520,
        destLeft: -30,
        destTop: 860,
        fade: 'right',
      },
      {
        srcLeft: 0.66,
        srcTop: 0.55,
        srcWidth: 0.34,
        srcHeight: 0.34,
        destWidth: 340,
        destHeight: 520,
        destLeft: 770,
        destTop: 900,
        fade: 'left',
      },
    ],
  },
  halloween_pumpkin_witch: {
    position: 'centre',
    blur: 12,
    brightness: 0.7,
    centerHold: 0.2,
    glow: '#ffb15a',
    vignette: 0.1,
    bands: [
      { srcTop: 0, srcHeight: 1, destHeight: 760, destTop: -40, fade: 'down' },
      {
        srcLeft: 0,
        srcTop: 0.2,
        srcWidth: 0.46,
        srcHeight: 0.7,
        destWidth: 640,
        destHeight: 1180,
        destLeft: -80,
        destTop: 220,
        fade: 'right',
      },
      {
        srcLeft: 0.6,
        srcTop: 0,
        srcWidth: 0.4,
        srcHeight: 0.9,
        destWidth: 560,
        destHeight: 1200,
        destLeft: 560,
        destTop: 40,
        fade: 'left',
      },
    ],
    extras: [
      {
        file: 'public/amethyst/skins/halloween-pumpkin-witch/bats.webp',
        width: 1040,
        left: 20,
        top: 8,
      },
      {
        file: 'public/amethyst/skins/halloween-pumpkin-witch/witch.webp',
        width: 980,
        left: 50,
        top: 1460,
      },
    ],
  },
  amethyst: {
    position: 'right',
    blur: 16,
    brightness: 0.86,
    centerHold: 0.38,
    glow: '#ff4ad8',
    vignette: 0.18,
    bands: [
      {
        srcLeft: 0.18,
        srcTop: 0,
        srcWidth: 0.82,
        srcHeight: 1,
        destHeight: 980,
        destTop: -40,
        fade: 'down',
      },
      {
        srcLeft: 0,
        srcTop: 0.15,
        srcWidth: 0.55,
        srcHeight: 0.7,
        destWidth: 640,
        destHeight: 1400,
        destLeft: -80,
        destTop: 260,
        fade: 'right',
      },
      { srcTop: 0.72, srcHeight: 0.28, destHeight: 520, destTop: 1420, fade: 'up' },
    ],
  },
  gilded_autumn: {
    position: 'centre',
    blur: 14,
    brightness: 0.9,
    centerHold: 0.4,
    glow: '#ffb703',
    vignette: 0.1,
    bands: [
      { srcTop: 0, srcHeight: 0.62, destHeight: 860, destTop: -40, fade: 'down' },
      { srcTop: 0.4, srcHeight: 0.6, destHeight: 860, destTop: 1120, fade: 'up' },
      {
        srcLeft: 0,
        srcTop: 0.2,
        srcWidth: 0.4,
        srcHeight: 0.6,
        destWidth: 420,
        destHeight: 900,
        destLeft: -40,
        destTop: 520,
        fade: 'right',
      },
      {
        srcLeft: 0.6,
        srcTop: 0.15,
        srcWidth: 0.4,
        srcHeight: 0.6,
        destWidth: 420,
        destHeight: 900,
        destLeft: 700,
        destTop: 560,
        fade: 'left',
      },
    ],
  },
  midnight_rose: {
    position: 'centre',
    blur: 12,
    brightness: 0.82,
    centerHold: 0.36,
    glow: '#e7a0c4',
    vignette: 0.14,
    bands: [
      { srcTop: 0.32, srcHeight: 0.68, destHeight: 860, destTop: -20, fade: 'down', flipY: true },
      { srcTop: 0.38, srcHeight: 0.62, destHeight: 820, destTop: 1140, fade: 'up' },
      {
        srcLeft: 0.55,
        srcTop: 0.4,
        srcWidth: 0.45,
        srcHeight: 0.5,
        destWidth: 460,
        destHeight: 980,
        destLeft: 680,
        destTop: 480,
        fade: 'left',
      },
    ],
  },
  pearl_rose: {
    position: 'attention',
    blur: 12,
    brightness: 0.94,
    centerHold: 0.4,
    glow: '#f3c7b8',
    vignette: 0.08,
    bands: [
      { srcTop: 0.35, srcHeight: 0.65, destHeight: 860, destTop: -20, fade: 'down', flipY: true },
      { srcTop: 0.42, srcHeight: 0.58, destHeight: 820, destTop: 1140, fade: 'up' },
      {
        srcLeft: 0.5,
        srcTop: 0.35,
        srcWidth: 0.5,
        srcHeight: 0.55,
        destWidth: 480,
        destHeight: 1000,
        destLeft: 660,
        destTop: 460,
        fade: 'left',
      },
    ],
  },
  rose_champagne: {
    position: 'centre',
    blur: 12,
    brightness: 0.92,
    centerHold: 0.38,
    glow: '#f6d7b0',
    vignette: 0.08,
    bands: [
      { srcTop: 0.36, srcHeight: 0.64, destHeight: 860, destTop: -10, fade: 'down', flipY: true },
      { srcTop: 0.36, srcHeight: 0.64, destHeight: 840, destTop: 1120, fade: 'up' },
      {
        srcLeft: 0.48,
        srcTop: 0.3,
        srcWidth: 0.52,
        srcHeight: 0.55,
        destWidth: 500,
        destHeight: 980,
        destLeft: 640,
        destTop: 500,
        fade: 'left',
      },
    ],
  },
}

async function buildPlate(source: string, plan: PlatePlan) {
  const position = plan.position ?? 'centre'
  const cover = await sharp(source)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position })
    .png()
    .toBuffer()
  const soft = await sharp(cover)
    .blur(plan.blur ?? 18)
    .modulate({ brightness: plan.brightness ?? 0.9, saturation: 1.12 })
    .png()
    .toBuffer()
  const framed = await sharp(cover)
    .ensureAlpha()
    .composite([{ input: await edgeMask(plan.centerHold ?? 0.4), blend: 'dest-in' }])
    .png()
    .toBuffer()
  const layers: sharp.OverlayOptions[] = [
    { input: soft, left: 0, top: 0 },
    { input: framed, left: 0, top: 0 },
  ]
  if (plan.glow) {
    const glow = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="540" cy="1020" r="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${plan.glow}" stop-opacity="0.7"/>
      <stop offset="0.55" stop-color="${plan.glow}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${plan.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="540" cy="1020" rx="460" ry="520" fill="url(#glow)"/>
</svg>`)
    layers.push({ input: await sharp(glow).png().toBuffer(), left: 0, top: 0, blend: 'screen' })
  }
  for (const spec of plan.bands) layers.push(await makeBand(source, spec))
  layers.push({ input: await vignette(plan.vignette), left: 0, top: 0 })
  layers.push({ input: await sharp(starField(plan.glow ?? '#ffffff')).png().toBuffer(), left: 0, top: 0 })
  for (const extra of plan.extras ?? []) {
    layers.push({
      input: await sharp(path.join(process.cwd(), extra.file))
        .resize({ width: extra.width })
        .png()
        .toBuffer(),
      left: extra.left,
      top: extra.top,
    })
  }
  return sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#07060c' },
  })
    .composite(layers)
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
