// Offline derivatives only. Approved legacy source images are never overwritten.
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const sources = [
  '/amethyst/skins/sunset-beach/hero-approved.png',
  '/amethyst/skins/halloween-pumpkin-witch/witch.webp',
]
const manifest = {}
mkdirSync('public/amethyst/ssr-images', { recursive: true })
for (const source of sources) {
  const input = readFileSync('public' + source)
  const { width, height } = await sharp(input).metadata()
  const id = source.split('/').slice(-2).join('-').replace(/\.[^.]+$/, '')
  const variants = []
  // Do not invent detail by upscaling the 1672px original to 2400px.
  for (const w of [...new Set([640, 1080, 1600, width].filter(w => w <= width))]) {
    const variant = { width: w, height: Math.round(height * w / width) }
    for (const format of ['avif', 'webp']) {
      const url = `/amethyst/ssr-images/${id}-${w}.${format}`
      const encoder = sharp(input).resize({ width: w })
      const output = await (format === 'avif'
        ? encoder.avif({ quality: 80, effort: 7, chromaSubsampling: '4:4:4' })
        : encoder.webp({ quality: 92, effort: 6, alphaQuality: 100 })).toBuffer()
      writeFileSync('public' + url, output)
      variant[format] = { src: url, bytes: output.length }
    }
    variants.push(variant)
  }
  manifest[source] = { width, height, bytes: input.length, sha256: createHash('sha256').update(input).digest('hex'), variants }
}
writeFileSync('lib/amethyst/generated/hero-images.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify(manifest, null, 2))
