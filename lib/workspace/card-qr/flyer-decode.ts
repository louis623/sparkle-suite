import jsQR from 'jsqr'
import sharp from 'sharp'

/** Quiet zone around the placed QR so a crop does not clip the modules. */
const FLYER_QR_CROP_MARGIN = 16

export interface FlyerQrWindow {
  x: number
  y: number
  width: number
  height: number
}

export class FlyerQrDecodeError extends Error {
  readonly expectedUrl: string
  readonly decoded: string | null

  constructor(expectedUrl: string, decoded: string | null) {
    super(
      `Flyer QR decoded ${decoded ?? 'nothing'}, expected ${expectedUrl}.`,
    )
    this.name = 'FlyerQrDecodeError'
    this.expectedUrl = expectedUrl
    this.decoded = decoded
  }
}

async function decodeImage(buffer: Buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const decoded = jsQR(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    { inversionAttempts: 'dontInvert' },
  )
  return decoded?.data ?? null
}

async function decodeQrWindow(buffer: Buffer, window: FlyerQrWindow, scale: number) {
  const meta = await sharp(buffer).metadata()
  const imageWidth = meta.width ?? 0
  const imageHeight = meta.height ?? 0
  if (imageWidth < 2 || imageHeight < 2) return null
  const left = Math.max(0, Math.min(imageWidth - 2, Math.floor(window.x - FLYER_QR_CROP_MARGIN)))
  const top = Math.max(0, Math.min(imageHeight - 2, Math.floor(window.y - FLYER_QR_CROP_MARGIN)))
  const width = Math.max(
    1,
    Math.min(imageWidth - left, Math.ceil(window.width + FLYER_QR_CROP_MARGIN * 2)),
  )
  const height = Math.max(
    1,
    Math.min(imageHeight - top, Math.ceil(window.height + FLYER_QR_CROP_MARGIN * 2)),
  )
  const pipeline = sharp(buffer).extract({ left, top, width, height })
  const sized =
    scale === 1
      ? pipeline
      : pipeline.resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), {
          fit: 'fill',
        })
  return decodeImage(await sized.png().toBuffer())
}

/**
 * Scan the whole flyer first. Busy plates can hide a clean QR from that pass,
 * so a miss retries the known QR window at native size and at half size.
 */
export async function decodeFlyerQr(buffer: Buffer, window?: FlyerQrWindow | null) {
  const full = await decodeImage(buffer)
  if (full) return full
  if (!window) return null
  const native = await decodeQrWindow(buffer, window, 1)
  if (native) return native
  return decodeQrWindow(buffer, window, 0.5)
}

export async function assertFlyerQrDecodes(
  buffer: Buffer,
  expectedUrl: string,
  window?: FlyerQrWindow | null,
) {
  const decoded = await decodeFlyerQr(buffer, window)
  if (decoded !== expectedUrl) {
    throw new FlyerQrDecodeError(expectedUrl, decoded)
  }
}
