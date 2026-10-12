import { createHash } from 'node:crypto'
import sharp from 'sharp'
import {
  assertFlyerQrDecodes,
  type FlyerQrWindow,
} from '@/lib/workspace/card-qr/flyer-decode'
import { CARD_QR_FLYER_JPG_QUALITY } from '@/lib/workspace/card-qr/flyer-format'

export function flyerBytesSha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

/** JPG from the PNG pixels. Quality 94 and 4:4:4 keep the QR modules crisp. */
export async function encodeCardQrFlyerJpeg(png: Buffer) {
  return sharp(png)
    .jpeg({
      quality: CARD_QR_FLYER_JPG_QUALITY,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer()
}

/** One PNG render feeds both files. Both must scan before either is returned. */
export async function renderCheckedFlyerFiles(
  png: Buffer,
  expectedUrl: string,
  qrWindow?: FlyerQrWindow | null,
) {
  await assertFlyerQrDecodes(png, expectedUrl, qrWindow)
  const jpg = await encodeCardQrFlyerJpeg(png)
  await assertFlyerQrDecodes(jpg, expectedUrl, qrWindow)
  return { png, jpg }
}
