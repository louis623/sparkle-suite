import jsQR from 'jsqr'
import sharp from 'sharp'

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

export async function decodeFlyerQr(buffer: Buffer) {
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

export async function assertFlyerQrDecodes(buffer: Buffer, expectedUrl: string) {
  const decoded = await decodeFlyerQr(buffer)
  if (decoded !== expectedUrl) {
    throw new FlyerQrDecodeError(expectedUrl, decoded)
  }
}
