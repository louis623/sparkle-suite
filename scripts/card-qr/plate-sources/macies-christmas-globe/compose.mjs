import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../../../..')
const key = 'macies-christmas-globe'
const hero = path.join(dir, 'approved-hero.png')
const assets = path.join(root, 'public/amethyst/skins', key)
await sharp(hero).resize(1125, 675, { fit: 'cover' }).withMetadata({ density: 300 }).jpeg({ quality: 95 }).toFile(path.join(root, 'lib/workspace/card-qr/card-plates', key + '.jpg'))
await sharp(hero).resize(320, 180).webp({ quality: 82 }).toFile(path.join(root, 'public/card-qr-themes', key + '.webp'))
// The print renderer reserves the middle for dynamic copy and the QR. Keep
// Macie's face and the opened gift in a separate photographic footer.
const portrait = await sharp(path.join(dir, 'flyer-portrait.png')).resize(1080, 1920).toBuffer()
const foliage = await sharp(portrait).extract({ left: 0, top: 0, width: 1080, height: 960 }).resize(1080, 1538, { fit: 'fill' }).png().toBuffer()
// Set the scene inside a brass-edged photographic window in the pine footer.
const landscape = await sharp(hero).resize(822, 462, { fit: 'cover' }).png().toBuffer()
const scene = await sharp(landscape).extract({ left: 0, top: 34, width: 822, height: 380 }).png().toBuffer()
const footer = await sharp({ create: { width: 1080, height: 380, channels: 3, background: '#17372f' } })
  .composite([
    { input: { create: { width: 826, height: 380, channels: 3, background: '#c5a06a' } }, left: 127, top: 0 },
    { input: scene, left: 129, top: 0 },
  ]).png().toBuffer()
await sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#c5a06a' } })
  .composite([{ input: foliage, top: 0, left: 0 }, { input: footer, top: 1540, left: 0 }])
  .webp({ quality: 90 }).toFile(path.join(assets, 'flyer/plate.webp'))
