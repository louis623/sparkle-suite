import sharp from 'sharp'

const MAX_EDGE = 2000
const MAX_INPUT_PIXELS = 40_000_000

export interface NormalizedTeamProfilePhoto {
  buffer: Buffer
  contentType: 'image/jpeg'
  width: number
  height: number
}

function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  return Buffer.from(data)
}

/**
 * Bake EXIF orientation into pixels and strip the orientation tag so public
 * circle crops cannot ship sideways iPhone uploads. Does not invent a face
 * crop — Workspace Smart Frame owns focal point / zoom / straighten.
 */
export async function normalizeTeamProfilePhoto(
  data: Buffer | Uint8Array | ArrayBuffer,
): Promise<NormalizedTeamProfilePhoto> {
  const input = toBuffer(data)
  const oriented = sharp(input, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate()

  const metadata = await oriented.metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read that profile photo.')
  }

  const longest = Math.max(metadata.width, metadata.height)
  const pipeline =
    longest > MAX_EDGE
      ? oriented.resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
      : oriented

  const buffer = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
  const output = await sharp(buffer).metadata()

  return {
    buffer,
    contentType: 'image/jpeg',
    width: output.width ?? metadata.width,
    height: output.height ?? metadata.height,
  }
}
