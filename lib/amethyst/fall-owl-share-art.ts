import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

export const FALL_OWL_HERO_POSTER_RELATIVE_PATH =
  'public/amethyst/skins/fall-owl/hero-poster.webp'
export const FALL_OWL_HERO_POSTER_SHA256 =
  '8ccb49ca53ccc0e5da7e6e50fdc02ef6d20735f70f09cc994f156d2180af9693'

export const FALL_OWL_SHARE_SCENE = {
  width: 1200,
  height: 630,
} as const

export function assertApprovedFallOwlHeroPoster(bytes: Buffer) {
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== FALL_OWL_HERO_POSTER_SHA256) {
    throw new Error('Fall Owl hero poster does not match the approved artwork.')
  }

  return bytes
}

export async function readApprovedFallOwlHeroPoster() {
  const bytes = await readFile(
    join(process.cwd(), FALL_OWL_HERO_POSTER_RELATIVE_PATH),
  )
  return assertApprovedFallOwlHeroPoster(bytes)
}

/**
 * Cover-crops the approved hero poster to the Open Graph frame. The owl and
 * moon stay in frame; nothing is redrawn.
 */
export async function renderFallOwlShareScenePng() {
  const poster = await readApprovedFallOwlHeroPoster()
  return sharp(poster)
    .resize(FALL_OWL_SHARE_SCENE.width, FALL_OWL_SHARE_SCENE.height, {
      fit: 'cover',
      position: 'centre',
    })
    .png()
    .toBuffer()
}

export async function loadFallOwlShareSceneDataUri() {
  const png = await renderFallOwlShareScenePng()
  return `data:image/png;base64,${png.toString('base64')}`
}
